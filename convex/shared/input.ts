export function requiredString(value: unknown, name: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required`)
  }

  return value.trim()
}

export function requiredRawString(value: unknown, name: string) {
  if (typeof value !== "string" || value === "") {
    throw new Error(`${name} is required`)
  }

  return value
}

export function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined
}

export function requiredNumber(value: unknown, name: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${name} is required`)
  }

  return Math.trunc(value)
}

export function boundedNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(minimum, Math.min(maximum, Math.trunc(value)))
}

export function requiredObject(value: unknown, name: string) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} is required`)
  }

  return value
}

export function requiredStringArray(value: unknown, name: string) {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string" && item !== "")
  ) {
    throw new Error(`${name} is required`)
  }

  return value
}

export function optionalStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item !== "")
    : []
}

export function setOptionalSearchParam(url: URL, key: string, value: unknown) {
  const normalized = optionalString(value)

  if (normalized !== undefined) {
    url.searchParams.set(key, normalized)
  }
}

export function readNested(
  value: Record<string, unknown>,
  key: string,
  nestedKey?: string
) {
  const child = value[key]

  if (nestedKey === undefined) {
    return child
  }

  return typeof child === "object" && child !== null
    ? (child as Record<string, unknown>)[nestedKey]
    : undefined
}

export function readArray(value: unknown) {
  return Array.isArray(value) ? value : []
}
