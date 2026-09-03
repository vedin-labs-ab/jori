import { vi } from "vitest"
import { type RuntimeModelTokens } from "../contracts/runtime/trace"
import {
  type RuntimeContext,
  type RuntimeId,
} from "../contracts/runtime/worker"
import {
  type ModelResponse,
  type ModelRuntime,
  type ModelToolCall,
} from "../trigger/model/types"

export type QueuedModelResponse =
  | {
      content: string
      reasoning?: string | null
      type: "stop"
      tokens?: RuntimeModelTokens
    }
  | {
      content: string | null
      reasoning?: string | null
      toolCalls: ModelToolCall[]
      type: "tool_calls"
      tokens?: RuntimeModelTokens
    }

export function runtimeId<TableName extends string>(value: string) {
  return value as RuntimeId<TableName>
}

/** A loaded run context with every field at its quiet default. */
export function runtimeContext(
  overrides: Partial<RuntimeContext> = {}
): RuntimeContext {
  return {
    activeSurface: null,
    drained: null,
    handoffs: { approvals: [], offers: [] },
    prompt: {
      context: "context",
      instructions: "system",
      organization: null,
      person: null,
      place: null,
      requester: null,
    },
    result: null,
    run: {
      id: runtimeId<"runs">("run_1"),
      organizationId: "organization",
      rootId: null,
      sandboxId: null,
      status: "running",
    },
    session: null,
    tools: [],
    ...overrides,
  }
}

export function createQueuedModel(responses: QueuedModelResponse[]) {
  const queue = queuedModelResponses(responses)

  return {
    complete: vi.fn<ModelRuntime["complete"]>(async () => {
      const response = queue.shift()

      if (response === undefined) {
        throw new Error("No model response queued.")
      }

      return response
    }),
  } satisfies ModelRuntime
}

function queuedModelResponses(
  responses: QueuedModelResponse[]
): ModelResponse[] {
  return responses.map(queuedModelResponse)
}

function queuedModelResponse(response: QueuedModelResponse): ModelResponse {
  const base = {
    reasoning: response.reasoning ?? null,
    tokens: response.tokens ?? emptyTokens(),
  }

  return response.type === "stop"
    ? { ...base, content: response.content, type: "stop" }
    : {
        ...base,
        content: response.content,
        toolCalls: response.toolCalls,
        type: "tool_calls",
      }
}

function emptyTokens(): RuntimeModelTokens {
  return {
    cacheRead: 0,
    cacheWrite: 0,
    input: 0,
    output: 0,
    reasoning: 0,
    total: 0,
    uncached: 0,
  }
}
