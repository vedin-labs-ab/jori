import {
  type ModelMessage,
  type ModelRuntime,
  type ModelTool,
} from "../model/types"
import { type ToolRuntime } from "../tool"
import { type RuntimeTraceMetrics } from "../types"
import { recordActivityEvent } from "./events"

export async function completeModelStep(args: {
  attempt: number
  firstTurn: boolean
  messages: ModelMessage[]
  model: ModelRuntime
  runtime: ToolRuntime
  step: number
  tools: ModelTool[]
}) {
  const sequence = modelSequence(args.step)
  const startedAt = Date.now()

  await recordActivityEvent(args.runtime.convex, args.runtime.context, {
    attempt: args.attempt,
    data: {
      status: "running",
      title: "Thinking",
    },
    sequence,
    source: "trigger.model",
    type: "model.started",
  })

  try {
    const response = await args.model.complete({
      firstTurn: args.firstTurn,
      messages: args.messages,
      tools: args.tools,
    })

    await recordModelCompleted(args.runtime, {
      attempt: args.attempt,
      durationMs: Date.now() - startedAt,
      response,
      sequence,
    })

    return response
  } catch (error) {
    await recordActivityEvent(args.runtime.convex, args.runtime.context, {
      attempt: args.attempt,
      data: {
        summary: error instanceof Error ? error.message : "Unknown model error",
        status: "failed",
        title: "Model request failed",
      },
      sequence,
      source: "trigger.model",
      type: "model.failed",
    })
    throw error
  }
}

function recordModelCompleted(
  runtime: ToolRuntime,
  args: {
    attempt: number
    durationMs: number
    response: Awaited<ReturnType<ModelRuntime["complete"]>>
    sequence: number
  }
) {
  return recordActivityEvent(runtime.convex, runtime.context, {
    attempt: args.attempt,
    data: {
      metrics: modelMetrics(args.response, args.durationMs),
      status: "completed",
      summary: modelSummary(args.response),
      title: "Model step completed",
    },
    sequence: args.sequence,
    source: "trigger.model",
    type: "model.completed",
  })
}

function modelMetrics(
  response: Awaited<ReturnType<ModelRuntime["complete"]>>,
  durationMs: number
): RuntimeTraceMetrics {
  return {
    durationMs,
    inputCacheReadTokens: response.usage?.inputCacheReadTokens,
    inputCacheWriteTokens: response.usage?.inputCacheWriteTokens,
    inputTokens: response.usage?.inputTokens,
    inputUncachedTokens: response.usage?.inputUncachedTokens,
    outputTokens: response.usage?.outputTokens,
    reasoningTokens: response.usage?.reasoningTokens,
    toolCalls: response.type === "tool_calls" ? response.toolCalls.length : 0,
    totalTokens: response.usage?.totalTokens,
  }
}

function modelSummary(response: Awaited<ReturnType<ModelRuntime["complete"]>>) {
  if (response.type === "tool_calls") {
    return response.toolCalls.length === 1
      ? "Selected 1 action."
      : `Selected ${response.toolCalls.length} actions.`
  }

  return "Returned control without an action."
}

function modelSequence(step: number) {
  return step * 100 - 1
}
