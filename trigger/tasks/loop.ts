import { promptTemplates } from "../../convex/prompts/generated"
import {
  type ModelMessage,
  type ModelRuntime,
  type ModelToolCall,
} from "../model/types"
import { executeToolCall, modelTools, type ToolRuntime } from "../tool"
import { type RuntimeContext } from "../types"
import { recordRunEvent } from "./events"
import { formatSessionMessage } from "./messages"

type AgentLoopPhase = "normal" | "repair"
type AgentLoopOutput = {
  message: ""
  status: "completed"
}
type StopResult =
  | {
      kind: "completed"
      output: AgentLoopOutput
    }
  | {
      kind: "continue"
      phase: AgentLoopPhase
    }

const invalidStopRepairInstruction = promptTemplates["repair/invalid"].trim()
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
  let phase: AgentLoopPhase = "normal"

  for (let step = 1; step <= maxModelSteps; step += 1) {
    if (await appendSessionMessages(args.runtime, messages)) {
      phase = "normal"
    }

    const response = await args.model.complete({
      messages,
      tools: modelToolsForPhase(args.runtime.context.tools, phase),
    })

    if (response.type === "stop") {
      const stop = await handleStopResponse({
        attempt: args.attempt,
        content: response.content,
        messages,
        phase,
        runtime: args.runtime,
        step,
      })

      if (stop.kind === "completed") {
        return stop.output
      }

      phase = stop.phase
      continue
    }

    if (phase === "repair") {
      throw new Error("Model returned tool calls during repair.")
    }

    phase = "normal"
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

async function handleStopResponse(args: {
  attempt: number
  content: string
  messages: ModelMessage[]
  phase: AgentLoopPhase
  runtime: ToolRuntime
  step: number
}): Promise<StopResult> {
  if (await appendSessionMessages(args.runtime, args.messages)) {
    return { kind: "continue", phase: "normal" }
  }

  if (!isEmptyStop(args.content)) {
    if (args.phase === "repair") {
      throw new Error("Model returned non-empty stop content after repair.")
    }

    appendInvalidStopRepair(args.messages, args.content)
    return { kind: "continue", phase: "repair" }
  }

  await completeRun(args.runtime, args.step, args.attempt)

  return {
    kind: "completed",
    output: {
      message: "",
      status: "completed",
    },
  }
}

function modelToolsForPhase(
  tools: RuntimeContext["tools"],
  phase: AgentLoopPhase
) {
  return phase === "repair" ? [] : modelTools(tools)
}

function isEmptyStop(content: string) {
  const normalized = content.trim()

  return normalized === "" || normalized === '""' || normalized === "''"
}

function appendInvalidStopRepair(messages: ModelMessage[], content: string) {
  messages.push({
    content,
    role: "assistant",
  })
  messages.push({
    content: invalidStopRepairInstruction,
    role: "user",
  })
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
  attempt: number
) {
  const sequence = step * toolSequenceOffset

  await recordRunEvent(
    runtime.convex,
    runtime.context,
    "run.completed",
    sequence,
    attempt
  )
}
