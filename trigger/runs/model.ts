import { joriModel } from "../../contracts/billing"
import { type RuntimeModelUsage } from "../../contracts/runtime/trace"
import { nullableText } from "../model/reasoning"
import {
  type ModelMessage,
  type ModelRuntime,
  type ModelTool,
} from "../model/types"
import { type AgentRuntime } from "../runtime"
import { formatError } from "../trace/events"
import { recordRuntimeEvent } from "../trace/runtime"

export async function completeModelStep(args: {
  attempt: number
  firstTurn: boolean
  messages: ModelMessage[]
  model: ModelRuntime
  runtime: AgentRuntime
  step: number
  tools: ModelTool[]
}) {
  const sequence = modelSequence(args.step)
  const startedAt = Date.now()
  // Recorded concurrently with the model call and joined before the outcome
  // trace, so the started trace always lands first and a failed trace write
  // still aborts the attempt.
  const startedPending = recordRuntimeEvent(
    args.runtime.platform,
    args.runtime.context,
    {
      attempt: args.attempt,
      sequence,
      type: "model.started",
    }
  )

  let response: Awaited<ReturnType<ModelRuntime["complete"]>>

  try {
    response = await args.model.complete({
      firstTurn: args.firstTurn,
      messages: args.messages,
      tools: args.tools,
    })
  } catch (error) {
    await startedPending.catch(() => undefined)
    await recordRuntimeEvent(args.runtime.platform, args.runtime.context, {
      attempt: args.attempt,
      data: { error: formatError(error) },
      sequence,
      type: "model.failed",
    })
    throw error
  }

  await startedPending
  await recordModelCompleted(args.runtime, {
    attempt: args.attempt,
    durationMs: Date.now() - startedAt,
    response,
    sequence,
  })

  return response
}

function recordModelCompleted(
  runtime: AgentRuntime,
  args: {
    attempt: number
    durationMs: number
    response: Awaited<ReturnType<ModelRuntime["complete"]>>
    sequence: number
  }
) {
  return recordRuntimeEvent(runtime.platform, runtime.context, {
    attempt: args.attempt,
    data: {
      model: joriModel,
      usage: modelUsage(args.response, args.durationMs),
      output: nullableText(args.response.content),
      reasoning: args.response.reasoning,
    },
    sequence: args.sequence,
    type: "model.completed",
  })
}

function modelUsage(
  response: Awaited<ReturnType<ModelRuntime["complete"]>>,
  durationMs: number
): RuntimeModelUsage {
  return {
    durationMs,
    ...response.usage,
    toolCalls: response.type === "tool_calls" ? response.toolCalls.length : 0,
  }
}

function modelSequence(step: number) {
  return step * 100 - 1
}
