import {
  type ModelMessage,
  type ModelResponse,
  type ModelRuntime,
  type ModelToolCall,
} from "../model/types"
import { executeToolCall, modelTools, type ToolRuntime } from "../tool"
import { type RuntimeContext } from "../types"
import { recordRunEvent } from "./events"
import { reconcileHandoffs } from "./handoffs"
import { appendSessionMessages } from "./messages"
import { parkRun } from "./waiter"

type AgentLoopOutput = {
  message: ""
  status: "completed" | "stopped"
}
type YieldKind = "finish" | "stop"
type YieldOutcome = "finished" | "continue" | "aborted"

const maxModelSteps = 30
const toolSequenceOffset = 100

export async function runAgentLoop(args: {
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

  await reconcileHandoffs(args.runtime, messages)

  for (let step = 1; step <= maxModelSteps; step += 1) {
    await appendSessionMessages(args.runtime, messages)

    const response = await args.model.complete({
      firstTurn: step === 1,
      messages,
      tools: modelTools(args.runtime.context.tools),
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

  throw new Error("Model loop exceeded the maximum step count.")
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
  for (;;) {
    const { progressed, pending } = await reconcileHandoffs(runtime, messages)

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

function isEmptyStop(content: string) {
  const normalized = content.trim()

  return normalized === "" || normalized === '""' || normalized === "''"
}

function appendStopRepair(
  messages: ModelMessage[],
  content: string,
  context: RuntimeContext
) {
  if (!isEmptyStop(content)) {
    messages.push({
      content,
      role: "assistant",
    })
  }

  messages.push({
    content: stopRepairInstruction({
      canReact: hasSurfaceReactionTool(context),
      canReply: hasTool(context.tools, "send_reply"),
    }),
    role: "user",
  })
}

function hasTool(tools: RuntimeContext["tools"], name: string) {
  return tools.some((tool) => tool.name === name && tool.mode !== "blocked")
}

function stopRepairInstruction(args: { canReact: boolean; canReply: boolean }) {
  const instructions = [
    "The run is not finished.",
    "Any words you write outside a tool call reach no one.",
  ]

  if (args.canReply) {
    instructions.push(
      visibleCommunicationInstruction(args.canReact),
      "If no visible communication is warranted, call `finish_run` with `reason`."
    )
  } else {
    instructions.push("Call `finish_run` when the run is done.")
  }

  return instructions.join(" ")
}

function visibleCommunicationInstruction(canReact: boolean) {
  const tools = canReact
    ? "`send_reply` or the surface-specific reaction tool"
    : "`send_reply`"

  return `Send any needed visible communication with ${tools}, then call \`finish_run\`.`
}

function hasSurfaceReactionTool(context: RuntimeContext) {
  const surface = context.activeSurface?.surface

  if (surface === "linear") {
    return hasTool(context.tools, "linear_add_reaction")
  }

  if (surface === "slack") {
    return hasTool(context.tools, "slack_add_reaction")
  }

  return false
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
