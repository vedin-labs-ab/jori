import {
  type ModelResponse,
  type ModelToolCall,
  type ModelUsage,
} from "../model/types"

export type QueuedModelResponse =
  | {
      content: string
      output?: string | null
      reasoning?: string | null
      type: "stop"
      usage?: ModelUsage
    }
  | {
      content: string | null
      output?: string | null
      reasoning?: string | null
      toolCalls: ModelToolCall[]
      type: "tool_calls"
      usage?: ModelUsage
    }

export function queuedModelResponses(
  responses: QueuedModelResponse[]
): ModelResponse[] {
  return responses.map(queuedModelResponse)
}

function queuedModelResponse(response: QueuedModelResponse): ModelResponse {
  const output = response.output ?? response.content
  const base = {
    output,
    reasoning: response.reasoning ?? null,
    usage: response.usage ?? emptyUsage(),
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

function emptyUsage(): ModelUsage {
  return {
    inputCacheReadTokens: 0,
    inputCacheWriteTokens: 0,
    inputTokens: 0,
    inputUncachedTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
  }
}
