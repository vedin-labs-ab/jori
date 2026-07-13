import {
  type ModelMessage,
  type ModelResponse,
  type ModelRuntime,
  type ModelToolCall,
} from "../model/types"
import { executeToolCall, modelTools, type ToolRuntime } from "../tool"
import { recordRuntimeEvent } from "../trace/runtime"
import { type HandoffSubject, type RuntimeContext } from "../types"
import { pendingHandoffSubjects } from "./handoffs/pending"
import { applyHandoffs, reconcileHandoffs } from "./handoffs/reconcile"
import {
  appendSessionMessages,
  promptMessages,
  seedSessionMessages,
} from "./messages"
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
  const messages: ModelMessage[] = promptMessages(args.runtime.context.prompt)

  // The context load already fetched the handoffs and drained the first
  // session batch, so a fresh run reaches the model with no extra reads.
  await applyHandoffs(args.runtime, messages, args.runtime.context.handoffs)
  await seedSessionMessages(args.runtime, messages)

  let drainPending = false

  for (let step = 1; step <= maxModelSteps; step += 1) {
    if (drainPending) {
      await appendSessionMessages(args.runtime, messages)
    }

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
    const result =
      response.type === "stop"
        ? settled(
            await settleYield(args.runtime, messages, "stop", response.content)
          )
        : await runModelToolStep(args, messages, response, step)

    if (result.outcome === "finished") {
      return completedOutput()
    }

    if (result.outcome === "aborted") {
      return stoppedOutput()
    }

    drainPending = result.drainPending
  }

  await failRun(args.runtime, args.attempt)
  return { message: "", status: "failed" }
}

type StepResult = {
  drainPending: boolean
  outcome: YieldOutcome
}

// Yield settlement drains messages as part of reconciling, so the next step
// starts fresh; a plain tool step leaves the drain to the next iteration.
function settled(outcome: YieldOutcome): StepResult {
  return { drainPending: false, outcome }
}

async function runModelToolStep(
  args: { attempt: number; runtime: ToolRuntime },
  messages: ModelMessage[],
  response: Extract<ModelResponse, { type: "tool_calls" }>,
  step: number
): Promise<StepResult> {
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
    return { drainPending: true, outcome: "continue" }
  }

  const outcome = await settleYield(args.runtime, messages, "finish")

  if (outcome === "finished") {
    await completeRun(args.runtime, tools.sequence + 1, args.attempt)
  }

  return settled(outcome)
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
  await recordRuntimeEvent(runtime.convex, runtime.context, {
    attempt,
    sequence,
    type: "run.completed",
  })
}

async function failRun(runtime: ToolRuntime, attempt: number) {
  await recordRuntimeEvent(runtime.convex, runtime.context, {
    attempt,
    data: { error: maxModelStepsError },
    sequence: maxModelSteps * toolSequenceOffset + toolSequenceOffset,
    type: "run.failed",
  })
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
