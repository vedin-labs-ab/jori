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
import { completeModelStep } from "./model"
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
      content: args.runtime.context.prompt,
      role: "system",
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
      visibleTools: visibleCommunicationTools(context.tools),
    }),
    role: "user",
  })
}

function hasTool(tools: RuntimeContext["tools"], name: string) {
  return tools.some((tool) => tool.name === name && tool.mode !== "blocked")
}

function stopRepairInstruction(args: { visibleTools: string[] }) {
  const instructions = [
    "The run is not finished.",
    "Any words you write outside a tool call reach no one.",
  ]

  if (args.visibleTools.length > 0) {
    instructions.push(
      visibleCommunicationInstruction(args.visibleTools),
      "If no visible communication is warranted, call `finish_run` with `reason`."
    )
  } else {
    instructions.push("Call `finish_run` when the run is done.")
  }

  return instructions.join(" ")
}

function visibleCommunicationTools(tools: RuntimeContext["tools"]) {
  return ["send_reply", "add_reaction"].filter((tool) => hasTool(tools, tool))
}

function visibleCommunicationInstruction(tools: string[]) {
  return `Send any needed visible communication with ${toolList(tools)}, then call \`finish_run\`.`
}

function toolList(tools: string[]) {
  return tools.map((tool) => `\`${tool}\``).join(" or ")
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
