export type JsonObject = Record<string, unknown>

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null"
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`
  }

  const entries = Object.entries(value)
    .filter((entry) => entry[1] !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))

  return `{${entries
    .map(
      ([key, entryValue]) => `${JSON.stringify(key)}:${stableJson(entryValue)}`
    )
    .join(",")}}`
}

export function stableHash(value: unknown) {
  const source = stableJson(value)
  let hash = 2_166_136_261

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }

  return (hash >>> 0).toString(16).padStart(8, "0")
}

export function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function assertJsonSerializable(input: {
  label: string
  maxBytes: number
  value: unknown
}) {
  assertConvexSafeObjectKeys(input.value, input.label)

  const json = JSON.stringify(input.value)

  if (json === undefined) {
    throw new Error(`${input.label} must be JSON serializable.`)
  }

  if (new TextEncoder().encode(json).byteLength > input.maxBytes) {
    throw new Error(`${input.label} exceeds ${input.maxBytes} bytes.`)
  }
}

function assertConvexSafeObjectKeys(value: unknown, path: string) {
  if (value === null || typeof value !== "object") {
    return
  }

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      assertConvexSafeObjectKeys(item, `${path}.${index}`)
    }

    return
  }

  for (const [key, entryValue] of Object.entries(value)) {
    if (key === "" || key.startsWith("$") || key.startsWith("_")) {
      throw new Error(`${path}.${key} is not a Convex-safe JSON object key.`)
    }

    assertConvexSafeObjectKeys(entryValue, `${path}.${key}`)
  }
}
