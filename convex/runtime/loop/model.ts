import { v } from "convex/values"
import { joriModel } from "../../../contracts/billing"
import { type RuntimePrompt } from "../../../contracts/runtime/prompt"
import { isTerminalRunStatus } from "../../../contracts/runtime/runs"
import { type RuntimeModelUsage } from "../../../contracts/runtime/trace"
import { internalAction } from "../../_generated/server"
import { type TranscriptMessage } from "../../runs/execution/transcript/schema"
import { loadRuntime } from "../context"
import { buildRuntimePrompt } from "../context/response"
import { nullableText } from "../model/reasoning"
import {
  type ModelResponse,
  type ModelRuntime,
  type ModelTool,
} from "../model/types"
import { type AgentRuntime, createAgentRuntime } from "../platform"
import { syncSessionReactions } from "../sessions"
import { modelTools } from "../tools/index"
import { formatError } from "../trace/events"
import { recordRuntimeEvent } from "../trace/record"
import { promptMessages } from "./transcript"

/** One turn's model call, as a workflow step. Reactions are synced first so
 *  the prompt renders the conversation as it stands. */
export const step = internalAction({
  args: {
    runId: v.id("runs"),
    turn: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const loaded = await loadRuntime(ctx, args.runId)

    if (loaded.session !== null) {
      await syncSessionReactions(ctx, loaded.session._id)
    }

    // The OpenRouter client is the heaviest module in the loop; loading it on
    // the call keeps this step's static graph within the runtime's
    // evaluation memory, as the act step does for the broker.
    const { OpenRouterModel } = await import("../model/chat")

    await runModelTurn({
      model: new OpenRouterModel(loaded.run._id),
      prompt: buildRuntimePrompt(
        loaded.input,
        loaded.activeSurface,
        loaded.permissions,
        loaded.skills,
        { person: loaded.session?.recency?.requester ?? null }
      ),
      runtime: createAgentRuntime(ctx, loaded),
      turn: args.turn,
    })

    return null
  },
})

/**
 * One turn's model call. The prompt prefix is rebuilt here and the history
 * comes from the transcript, so a retry sees exactly what the first attempt
 * saw. A saved assistant row means the turn already happened.
 */
export async function runModelTurn(args: {
  model: ModelRuntime
  prompt: RuntimePrompt
  runtime: AgentRuntime
  turn: number
}) {
  const runtime = args.runtime

  if (isTerminalRunStatus(runtime.context.run.status)) {
    return
  }

  const tail = await runtime.platform.tailTranscript()

  if (tail.assistant !== null && tail.results.length === 0) {
    return
  }

  const response = await completeModelStep({
    firstTurn: args.turn === 1,
    messages: [
      ...promptMessages(args.prompt),
      ...(await runtime.platform.listTranscript()),
    ],
    model: args.model,
    runtime,
    tools: modelTools(runtime.context.tools),
    turn: args.turn,
  })

  reportUndeliveredText(runtime, response, args.turn)
  await runtime.platform.appendTranscript([assistantMessage(response)])
}

export async function completeModelStep(args: {
  firstTurn: boolean
  messages: TranscriptMessage[]
  model: ModelRuntime
  runtime: AgentRuntime
  tools: ModelTool[]
  turn: number
}) {
  const sequence = modelSequence(args.turn)
  const startedAt = Date.now()
  // Recorded concurrently with the model call and joined before the outcome
  // trace, so the started trace always lands first and a failed trace write
  // still aborts the step.
  const startedPending = recordRuntimeEvent(
    args.runtime.platform,
    args.runtime.context,
    {
      sequence,
      type: "model.started",
    }
  )

  let response: ModelResponse

  try {
    response = await args.model.complete({
      firstTurn: args.firstTurn,
      messages: args.messages,
      tools: args.tools,
    })
  } catch (error) {
    await startedPending.catch(() => undefined)
    await recordRuntimeEvent(args.runtime.platform, args.runtime.context, {
      data: { error: formatError(error) },
      sequence,
      type: "model.failed",
    })
    throw error
  }

  await startedPending
  await recordModelCompleted(args.runtime, {
    durationMs: Date.now() - startedAt,
    response,
    sequence,
  })

  return response
}

function assistantMessage(response: ModelResponse): TranscriptMessage {
  if (response.type === "stop") {
    return { content: response.content, role: "assistant" }
  }

  return {
    content: response.content,
    role: "assistant",
    toolCalls: response.toolCalls,
  }
}

function reportUndeliveredText(
  runtime: AgentRuntime,
  response: ModelResponse,
  turn: number
) {
  if (
    response.type !== "tool_calls" ||
    response.content === null ||
    response.content.trim() === ""
  ) {
    return
  }

  console.warn("Assistant text outside a tool call was not delivered.", {
    length: response.content.length,
    runId: runtime.context.run.id,
    tools: response.toolCalls.map((call) => call.name),
    turn,
  })
}

function recordModelCompleted(
  runtime: AgentRuntime,
  args: {
    durationMs: number
    response: ModelResponse
    sequence: number
  }
) {
  return recordRuntimeEvent(runtime.platform, runtime.context, {
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
  response: ModelResponse,
  durationMs: number
): RuntimeModelUsage {
  return {
    durationMs,
    tokens: response.tokens,
    toolCalls: response.type === "tool_calls" ? response.toolCalls.length : 0,
  }
}

function modelSequence(turn: number) {
  return turn * 100 - 1
}
