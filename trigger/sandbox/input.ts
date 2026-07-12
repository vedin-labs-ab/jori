export function normalizeToolInput(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function optionalTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined
}

export function requiredTrimmedString(value: unknown, name: string) {
  const text = optionalTrimmedString(value)

  if (text === undefined) {
    throw new Error(`Missing ${name}`)
  }

  return text
}

export function boundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  return Math.min(maximum, Math.max(minimum, Math.floor(value)))
}

export function boundedTimeoutMs(value: unknown) {
  return boundedInteger(value, 120_000, 1_000, 1_200_000)
}
