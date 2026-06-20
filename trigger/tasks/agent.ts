import { task } from "@trigger.dev/sdk/v3"
import { MiloConvexClient } from "../convex"
import { errorDetails, runtimeEvent } from "../events"
import { OpenRouterModelRuntime } from "../model/openrouter"
import {
  type ModelMessage,
  type ModelRuntime,
  type ModelToolCall,
} from "../model/types"
import { E2BSandboxRuntime } from "../sandbox/e2b"
import { executeToolCall, modelTools, type ToolRuntime } from "../tool"
import {
  type AgentRunPayload,
  agentTaskId,
  type RuntimeContext,
  type RuntimeEventType,
  type RuntimeMessage,
  type RuntimeRunTraceData,
} from "../types"

const maxAttempts = 3
const maxModelSteps = 30
const toolSequenceOffset = 100

export const miloAgentRun = task({
  id: agentTaskId,
  maxDuration: 7200,
  retry: {
    factor: 2,
    maxAttempts,
    maxTimeoutInMs: 60_000,
    minTimeoutInMs: 1_000,
    randomize: true,
  },
  run: async (payload: AgentRunPayload, { ctx }) => {
    const convex = new MiloConvexClient()
    const context = await convex.loadRun(payload)
    const sandbox = new E2BSandboxRuntime(
      convex,
      context.run.id,
      context.run.sandboxId
    )

    if (isTerminalStatus(context.run.status)) {
      await sandbox.cleanup()

      return {
        status: "skipped",
      }
    }

    const attempt = ctx.attempt.number

    await recordRunEvent(convex, context, "run.started", 0, attempt)

    try {
      const output = await runAgentLoop({
        attempt,
        model: new OpenRouterModelRuntime(),
        runtime: { convex, context, sandbox },
      })
      await sandbox.cleanup()

      return output
    } catch (error) {
      await handleFailure({ attempt, context, convex, error, sandbox })
      throw error
    }
  },
})

function isTerminalStatus(status: RuntimeContext["run"]["status"]) {
  return status === "completed" || status === "failed" || status === "stopped"
}

async function runAgentLoop(args: {
  attempt: number
  model: ModelRuntime
  runtime: ToolRuntime
}) {
  const messages: ModelMessage[] = [
    {
      content: args.runtime.context.prompt,
      role: "system",
    },
  ]
  const tools = modelTools(args.runtime.context.tools)

  for (let step = 1; step <= maxModelSteps; step += 1) {
    await appendSessionMessages(args.runtime, messages)
    const response = await args.model.complete({ messages, tools })

    if (response.type === "message") {
      if (await appendSessionMessages(args.runtime, messages)) {
        continue
      }

      await completeRun(args.runtime, step, args.attempt, response.content)

      return {
        message: response.content,
        status: "completed",
      }
    }

    messages.push({
      content: response.content,
      role: "assistant",
      toolCalls: response.toolCalls,
    })
    await runToolCalls(args.runtime, messages, response.toolCalls, {
      attempt: args.attempt,
      step,
    })
  }

  throw new Error("Model loop exceeded the maximum step count.")
}

async function appendSessionMessages(
  runtime: ToolRuntime,
  messages: ModelMessage[]
) {
  const session = runtime.context.session

  if (session === null) {
    return false
  }

  let appended = false
  let hasMore = true

  while (hasMore) {
    const drained = await runtime.convex.drainSessionMessages({
      sessionId: session.id,
    })

    hasMore = drained.hasMore

    for (const message of drained.messages) {
      messages.push({
        content: formatSessionMessage(message),
        role: "user",
      })
      appended = true
    }
  }

  return appended
}

function formatSessionMessage(message: RuntimeMessage) {
  const observed = message.observedAt ?? message.createdAt
  const routing = message.routing

  return [
    `New ${message.integration} message in the active conversation.`,
    `Source: ${message.source}`,
    `Authority: ${message.authority}`,
    ...(message.actor === null ? [] : [`Actor: ${message.actor}`]),
    `Type: ${message.type}`,
    `Mentioned Milo: ${message.mentioned ? "yes" : "no"}`,
    `Observed at: ${new Date(observed).toISOString()}`,
    ...(routing === null
      ? []
      : [
          `Intake route: ${routing.route}`,
          ...(routing.reply === null
            ? []
            : [`Milo already replied: ${routing.reply}`]),
        ]),
    "",
    "Message:",
    "```text",
    message.text,
    "```",
  ].join("\n")
}

async function runToolCalls(
  runtime: ToolRuntime,
  messages: ModelMessage[],
  calls: ModelToolCall[],
  meta: { attempt: number; step: number }
) {
  let index = 0

  for (const call of calls) {
    const content = await executeToolCall({
      attempt: meta.attempt,
      call,
      runtime,
      sequence: meta.step * toolSequenceOffset + index,
    })

    messages.push({
      content,
      role: "tool",
      toolCallId: call.id,
      toolName: call.name,
    })
    index += 1
  }
}

async function completeRun(
  runtime: ToolRuntime,
  step: number,
  attempt: number,
  content: string
) {
  const sequence = step * toolSequenceOffset

  const delivery = await runtime.convex.deliverFinalMessage({
    content,
    runId: runtime.context.run.id,
  })
  await recordRunEvent(
    runtime.convex,
    runtime.context,
    "message.final",
    sequence,
    attempt,
    { queued: delivery.queued }
  )
  await recordRunEvent(
    runtime.convex,
    runtime.context,
    "run.completed",
    sequence + 1,
    attempt
  )
}

async function handleFailure(args: {
  attempt: number
  context: RuntimeContext
  convex: MiloConvexClient
  error: unknown
  sandbox: E2BSandboxRuntime
}) {
  if (args.attempt < maxAttempts) {
    return
  }

  await recordRunEvent(
    args.convex,
    args.context,
    "run.failed",
    999_999,
    args.attempt,
    errorDetails(args.error)
  )
  await args.sandbox.cleanup()
}

async function recordRunEvent(
  convex: MiloConvexClient,
  context: RuntimeContext,
  type: RuntimeEventType,
  sequence: number,
  attempt: number,
  data?: RuntimeRunTraceData
) {
  await convex.recordEvent(
    runtimeEvent({
      attempt,
      data,
      runId: context.run.id,
      sequence,
      source: "trigger.run",
      type,
    })
  )
}
