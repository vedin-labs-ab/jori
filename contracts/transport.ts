import {
  decodeJson,
  decodeJsonObject,
  type EncodedJson,
  encodeJson,
  encodeUnknownJson,
  type JsonObject,
  type JsonValue,
} from "./json"

type ToolInputTransport = {
  inputJson: EncodedJson
}

export function encodeToolInput(input: JsonObject): ToolInputTransport {
  return { inputJson: encodeJson(input) }
}

export function decodeToolInput(transport: { inputJson: string }): JsonObject {
  return decodeJsonObject(transport.inputJson)
}

export function encodeToolResult(result: unknown): EncodedJson {
  return encodeUnknownJson(result ?? null)
}

export function decodeToolResult(resultJson: string): JsonValue {
  return decodeJson(resultJson)
}
