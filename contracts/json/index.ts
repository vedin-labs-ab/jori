type JsonPrimitive = boolean | null | number | string
type JsonArray = JsonValue[]
export type JsonObject = {
  [key: string]: JsonValue
}
export type JsonValue = JsonArray | JsonObject | JsonPrimitive

declare const encodedJsonBrand: unique symbol

type EncodedJson = string & {
  readonly [encodedJsonBrand]: "EncodedJson"
}

export function encodeJson(value: JsonValue): EncodedJson {
  const encoded = JSON.stringify(value)

  if (encoded === undefined) {
    throw new Error("Could not encode JSON value")
  }

  return encoded as EncodedJson
}

function encodeUnknownJson(value: unknown) {
  return encodeJson(toJsonValue(value))
}

export function decodeJson(value: string): JsonValue {
  const parsed: unknown = JSON.parse(value)

  return toJsonValue(parsed)
}

/** A tool result, with a missing result normalized to json null. */
export function encodeToolResult(result: unknown): EncodedJson {
  return encodeUnknownJson(result ?? null)
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

// Shape guard for reading fields off unknown data. Accepts any non-array
// object; isPlainObject below additionally rejects class instances, which
// JSON conversion requires.
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)

  return prototype === Object.prototype || prototype === null
}

/** RFC 7396-style merge patch: objects merge recursively, null deletes. */
export function mergePatch(target: unknown, patch: unknown): unknown {
  if (!isRecord(patch)) {
    return patch
  }

  const result: Record<string, unknown> = isRecord(target) ? { ...target } : {}

  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key]
    } else {
      result[key] = mergePatch(result[key], value)
    }
  }

  return result
}

/** The value at a key path, or undefined when any step is missing. */
export function readPath(value: unknown, path: readonly string[]): unknown {
  let current = value

  for (const key of path) {
    if (!isRecord(current)) {
      return undefined
    }

    current = current[key]
  }

  return current
}

/** A merge patch that sets exactly one key path to a value. */
export function pathPatch(path: readonly string[], value: unknown): unknown {
  return path.reduceRight<unknown>((nested, key) => ({ [key]: nested }), value)
}

/** A copy of the record without its undefined entries, so optional fields
 *  can be written inline and absent ones simply disappear. */
export function compactRecord<T extends Record<string, unknown>>(record: T): T {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  ) as T
}
