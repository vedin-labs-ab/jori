import { type JsonObject } from "../../../contracts/json"
import { type RuntimeModelTokens } from "../../../contracts/runtime/trace"
import { type TranscriptMessage } from "../../runs/execution/transcript/schema"

// The model sees exactly what the transcript stores. One shape for both keeps
// a saved turn and a replayed turn from drifting apart.
export type ModelMessage = TranscriptMessage

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
      reasoning: string | null
      tokens: RuntimeModelTokens
      type: "stop"
    }
  | {
      content: string | null
      reasoning: string | null
      toolCalls: ModelToolCall[]
      tokens: RuntimeModelTokens
      type: "tool_calls"
    }

export type ModelRuntime = {
  complete(args: {
    firstTurn: boolean
    messages: ModelMessage[]
    tools: ModelTool[]
  }): Promise<ModelResponse>
}
