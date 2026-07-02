import {
  type ModelMessage,
  type ModelResponse,
  type ModelRuntime,
  type ModelToolCall,
} from "../model/types"
import { executeToolCall, modelTools, type ToolRuntime } from "../tool"
import { type HandoffSubject, type RuntimeContext } from "../types"
import { recordRunEvent } from "./events"
import { pendingHandoffSubjects, reconcileHandoffs } from "./handoffs"
import { appendSessionMessages } from "./messages"
import { completeModelStep } from "./model"
import { appendStopRepair } from "./repair"
import { parkRun } from "./waiter"

type AgentLoopOutput = {
  message: ""
  status: "completed" | "failed" | "stopped"
}
type YieldKind = "finish" | "stop"
type YieldOutcome = "finished" | "continue" | "aborted"

const maxModelSteps = 30
const maxModelStepsError = "Model loop exceeded the maximum step count."
const toolSequenceOffset = 100

export async function runAgentLoop(args: {
  attempt: number
  model: ModelRuntime
  runtime: ToolRuntime
}) {
  const messages: ModelMessage[] = [
    {
      content: args.runtime.context.prompt.instructions,
      role: "system",
    },
    {
      content: args.runtime.context.prompt.context,
      role: "user",
    },
  ]

  await reconcileHandoffs(args.runtime, messages)

  for (let step = 1; step <= maxModelSteps; step += 1) {
    await appendSessionMessages(args.runtime, messages)

    const tools = modelTools(args.runtime.context.tools)
    const response = await completeModelStep({
      attempt: args.attempt,
      firstTurn: step === 1,
      messages,
      model: args.model,
      runtime: args.runtime,
      step,
      tools,
    })
    const outcome =
      response.type === "stop"
        ? await settleYield(args.runtime, messages, "stop", response.content)
        : await runModelToolStep(args, messages, response, step)

    if (outcome === "finished") {
      return completedOutput()
    }

    if (outcome === "aborted") {
      return stoppedOutput()
    }
  }

  await failRun(args.runtime, args.attempt)
  return { message: "", status: "failed" }
}

async function runModelToolStep(
  args: { attempt: number; runtime: ToolRuntime },
  messages: ModelMessage[],
  response: Extract<ModelResponse, { type: "tool_calls" }>,
  step: number
): Promise<YieldOutcome> {
  reportUndeliveredText(args.runtime, response, step)
  messages.push({
    content: response.content,
    role: "assistant",
    toolCalls: response.toolCalls,
  })
  const tools = await runToolCalls(args.runtime, messages, response.toolCalls, {
    attempt: args.attempt,
    step,
  })

  if (!tools.finished) {
    return "continue"
  }

  const outcome = await settleYield(args.runtime, messages, "finish")

  if (outcome === "finished") {
    await completeRun(args.runtime, tools.sequence + 1, args.attempt)
  }

  return outcome
}

function reportUndeliveredText(
  runtime: ToolRuntime,
  response: Extract<ModelResponse, { type: "tool_calls" }>,
  step: number
) {
  if (response.content === null || response.content.trim() === "") {
    return
  }

  console.warn("Assistant text outside a tool call was not delivered.", {
    length: response.content.length,
    runId: runtime.context.run.id,
    step,
    tools: response.toolCalls.map((call) => call.name),
  })
}

async function settleYield(
  runtime: ToolRuntime,
  messages: ModelMessage[],
  kind: YieldKind,
  content?: string
): Promise<YieldOutcome> {
  let refreshSubjects: HandoffSubject[] = []

  for (;;) {
    const { pending, progressed } = await reconcileHandoffs(
      runtime,
      messages,
      refreshSubjects
    )
    refreshSubjects = []

    if (progressed) {
      return "continue"
    }

    if (pending.length === 0) {
      return finalizeYield(messages, runtime.context, kind, content)
    }

    const wake = await parkRun(runtime, pending)

    if (wake.reason === "cancelled") {
      return "aborted"
    }

    refreshSubjects = pendingHandoffSubjects(pending)
  }
}

function finalizeYield(
  messages: ModelMessage[],
  context: RuntimeContext,
  kind: YieldKind,
  content?: string
): YieldOutcome {
  if (kind === "finish") {
    return "finished"
  }

  appendStopRepair(messages, content ?? "", context)

  return "continue"
}

async function runToolCalls(
  runtime: ToolRuntime,
  messages: ModelMessage[],
  calls: ModelToolCall[],
  meta: { attempt: number; step: number }
) {
  let index = 0

  for (const call of calls) {
    const sequence = meta.step * toolSequenceOffset + index
    const result = await executeToolCall({
      attempt: meta.attempt,
      call,
      runtime,
      sequence,
    })

    messages.push({
      content: result.content,
      role: "tool",
      toolCallId: call.id,
      toolName: call.name,
    })

    if (result.finished) {
      return { finished: true, sequence }
    }

    index += 1
  }

  return { finished: false, sequence: meta.step * toolSequenceOffset + index }
}

async function completeRun(
  runtime: ToolRuntime,
  sequence: number,
  attempt: number
) {
  await recordRunEvent(
    runtime.convex,
    runtime.context,
    "run.completed",
    sequence,
    attempt
  )
}

async function failRun(runtime: ToolRuntime, attempt: number) {
  await recordRunEvent(
    runtime.convex,
    runtime.context,
    "run.failed",
    maxModelSteps * toolSequenceOffset + toolSequenceOffset,
    attempt,
    { error: maxModelStepsError }
  )
}

function completedOutput(): AgentLoopOutput {
  return {
    message: "",
    status: "completed",
  }
}

function stoppedOutput(): AgentLoopOutput {
  return {
    message: "",
    status: "stopped",
  }
}
