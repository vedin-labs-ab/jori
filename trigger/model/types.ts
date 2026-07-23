import { type JsonObject } from "../../contracts/json"

export type ModelMessage =
  | {
      content: string
      role: "system" | "user"
    }
  | {
      content: string | null
      role: "assistant"
      toolCalls?: ModelToolCall[]
    }
  | {
      content: string
      role: "tool"
      toolCallId: string
      toolName: string
    }

export type ModelTool = {
  description: string
  inputSchema: JsonObject
  name: string
}

export type ModelToolCall = {
  args: JsonObject
  id: string
  name: string
}

export type ModelUsage = {
  inputCacheReadTokens: number
  inputCacheWriteTokens: number
  inputTokens: number
  inputUncachedTokens: number
  outputTokens: number
  reasoningTokens: number
  totalTokens: number
}

export type ModelResponse =
  | {
      content: string
      reasoning: string | null
      usage: ModelUsage
      type: "stop"
    }
  | {
      content: string | null
      reasoning: string | null
      toolCalls: ModelToolCall[]
      usage: ModelUsage
      type: "tool_calls"
    }

export type ModelRuntime = {
  complete(args: {
    firstTurn: boolean
    messages: ModelMessage[]
    tools: ModelTool[]
  }): Promise<ModelResponse>
}
