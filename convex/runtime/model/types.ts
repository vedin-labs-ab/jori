import { type JsonObject } from "../../../contracts/json"
import { type ChatDelta, type ChatToolCallDelta } from "../../model/stream"
import { type ModelTokens } from "../../runs/execution/traces/schema"
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
      tokens: ModelTokens
      type: "stop"
    }
  | {
      content: string | null
      reasoning: string | null
      toolCalls: ModelToolCall[]
      tokens: ModelTokens
      type: "tool_calls"
    }

/** What the model has added since the last delta, offered while a
 *  completion streams; the response at the end holds the whole. */
export type ModelDelta = ChatDelta
export type ModelToolCallDelta = ChatToolCallDelta

export type ModelRuntime = {
  /** The model the runtime answers with, named on the completed trace so
   *  the turn is priced from what ran. */
  model: string
  complete(args: {
    messages: ModelMessage[]
    onDelta?: (delta: ModelDelta) => void
    tools: ModelTool[]
  }): Promise<ModelResponse>
}
