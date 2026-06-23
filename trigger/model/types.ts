import { type JsonObject } from "../types"

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

export type ModelResponse =
  | {
      content: string
      type: "stop"
    }
  | {
      content: string | null
      toolCalls: ModelToolCall[]
      type: "tool_calls"
    }

export type ModelRuntime = {
  complete(args: {
    messages: ModelMessage[]
    tools: ModelTool[]
  }): Promise<ModelResponse>
}
