type JsonPrimitive = boolean | null | number | string
type JsonArray = JsonValue[]
export type JsonObject = {
  [key: string]: JsonValue
}
export type JsonValue = JsonArray | JsonObject | JsonPrimitive

declare const encodedJsonBrand: unique symbol

export type EncodedJson = string & {
  readonly [encodedJsonBrand]: "EncodedJson"
}

export function encodeJson(value: JsonValue): EncodedJson {
  const encoded = JSON.stringify(value)

  if (encoded === undefined) {
    throw new Error("Could not encode JSON value")
  }

  return encoded as EncodedJson
}

export function encodeUnknownJson(value: unknown) {
  return encodeJson(toJsonValue(value))
}

export function decodeJson(value: string): JsonValue {
  const parsed: unknown = JSON.parse(value)

  return toJsonValue(parsed)
}

export function decodeJsonObject(value: string): JsonObject {
  return toJsonObject(decodeJson(value))
}

export function toJsonObject(value: unknown): JsonObject {
  if (!isPlainObject(value)) {
    throw new Error("Expected a JSON object")
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, toJsonValue(entry)])
  )
}

function toJsonArray(value: unknown): JsonArray {
  if (!Array.isArray(value)) {
    throw new Error("Expected a JSON array")
  }

  return value.map(toJsonValue)
}

export function toJsonValue(value: unknown): JsonValue {
  if (value === null) {
    return null
  }

  if (Array.isArray(value)) {
    return toJsonArray(value)
  }

  switch (typeof value) {
    case "boolean":
    case "string":
      return value
    case "number":
      return finiteJsonNumber(value)
    case "object":
      return toJsonObject(value)
    default:
      throw new Error(`Unsupported JSON value: ${typeof value}`)
  }
}

function finiteJsonNumber(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error("JSON numbers must be finite")
  }

  return value
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)

  return prototype === Object.prototype || prototype === null
}
