import {
  decodeJsonObject,
  type EncodedJson,
  encodeJson,
  encodeUnknownJson,
  type JsonObject,
} from "."

export function encodeToolInput(input: JsonObject): EncodedJson {
  return encodeJson(input)
}

export function decodeToolInput(inputJson: string): JsonObject {
  return decodeJsonObject(inputJson)
}

export function encodeToolResult(result: unknown): EncodedJson {
  return encodeUnknownJson(result ?? null)
}
