import { promptTemplates } from "../../convex/prompts/generated"
import {
  type ModelMessage,
  type ModelRuntime,
  type ModelToolCall,
} from "../model/types"
import { executeToolCall, modelTools, type ToolRuntime } from "../tool"
import { type RuntimeContext } from "../types"
import { recordRunEvent } from "./events"
import { appendSessionMessages } from "./messages"

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
const activeSurfaceStopInstruction = [
  "The run is not finished.",
  "Assistant completion text is private and is not visible to the requester.",
  "Send any needed visible reply with `send_reply`, then call `finish_run`.",
  "If no visible reply is warranted, call `finish_run` with `reason`.",
].join(" ")
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
    const tools = await runToolCalls(
      args.runtime,
      messages,
      response.toolCalls,
      {
        attempt: args.attempt,
        step,
      }
    )

    if (tools.finished) {
      await completeRun(args.runtime, tools.sequence + 1, args.attempt)
      return completedOutput()
    }
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

  if (args.runtime.context.activeSurface !== null) {
    appendActiveSurfaceStopRepair(args.messages, args.content)
    return { kind: "continue", phase: "normal" }
  }

  if (!isEmptyStop(args.content)) {
    if (args.phase === "repair") {
      throw new Error("Model returned non-empty stop content after repair.")
    }

    appendInvalidStopRepair(args.messages, args.content)
    return { kind: "continue", phase: "repair" }
  }

  await completeRun(args.runtime, stepSequence(args.step), args.attempt)

  return {
    kind: "completed",
    output: completedOutput(),
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

function appendActiveSurfaceStopRepair(
  messages: ModelMessage[],
  content: string
) {
  if (!isEmptyStop(content)) {
    messages.push({
      content,
      role: "assistant",
    })
  }

  messages.push({
    content: activeSurfaceStopInstruction,
    role: "user",
  })
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

function stepSequence(step: number) {
  return step * toolSequenceOffset
}

function completedOutput(): AgentLoopOutput {
  return {
    message: "",
    status: "completed",
  }
}
