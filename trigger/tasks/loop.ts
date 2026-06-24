import {
  type ModelMessage,
  type ModelRuntime,
  type ModelToolCall,
} from "../model/types"
import { executeToolCall, modelTools, type ToolRuntime } from "../tool"
import { type RuntimeContext } from "../types"
import { recordRunEvent } from "./events"
import { appendSessionMessages } from "./messages"

type AgentLoopOutput = {
  message: ""
  status: "completed"
}
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

  for (let step = 1; step <= maxModelSteps; step += 1) {
    await appendSessionMessages(args.runtime, messages)

    const response = await args.model.complete({
      messages,
      tools: modelTools(args.runtime.context.tools),
    })

    if (response.type === "stop") {
      await handleStopResponse({
        content: response.content,
        messages,
        runtime: args.runtime,
      })
      continue
    }

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
  content: string
  messages: ModelMessage[]
  runtime: ToolRuntime
}) {
  if (await appendSessionMessages(args.runtime, args.messages)) {
    return
  }

  appendStopRepair(args.messages, args.content, args.runtime.context.tools)
}

function isEmptyStop(content: string) {
  const normalized = content.trim()

  return normalized === "" || normalized === '""' || normalized === "''"
}

function appendStopRepair(
  messages: ModelMessage[],
  content: string,
  tools: RuntimeContext["tools"]
) {
  if (!isEmptyStop(content)) {
    messages.push({
      content,
      role: "assistant",
    })
  }

  messages.push({
    content: stopRepairInstruction({
      canReact: hasTool(tools, "add_reaction"),
      canReply: hasTool(tools, "send_reply"),
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
    "Assistant completion text is private and is not visible to the requester.",
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
  const tools = canReact ? "`send_reply` or `add_reaction`" : "`send_reply`"

  return `Send any needed visible communication with ${tools}, then call \`finish_run\`.`
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
