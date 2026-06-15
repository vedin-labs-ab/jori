import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"

export type ProviderToolContext = {
  ctx: ActionCtx
  execution: Doc<"executions">
}

export async function fetchJson(
  url: string,
  options: {
    method: string
    headers: Record<string, string>
    body?: unknown
    emptyResponse?: unknown
  }
) {
  const response = await fetch(url, {
    method: options.method,
    headers: options.headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()
  const result =
    text === "" ? (options.emptyResponse ?? null) : JSON.parse(text)

  if (!response.ok) {
    throw new Error(`Provider API request failed: ${JSON.stringify(result)}`)
  }

  return result
}

export function jsonErrorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export function requiredString(value: unknown, name: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required`)
  }

  return value.trim()
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

export function base64Decode(value: string) {
  const normalized = value.replace(/\s/g, "")
  const binary = atob(normalized)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}

export function base64UrlEncode(value: string) {
  const bytes = new TextEncoder().encode(value)
  const base64 = base64EncodeBytes(bytes)

  return base64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

export function base64EncodeBytes(bytes: Uint8Array) {
  let binary = ""
  const chunkSize = 0x8000

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(offset, offset + chunkSize))
  }

  return btoa(binary)
}

export function formatProviderError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function jsonError(error: string, status: number) {
  return Response.json({ error }, { status })
}

export function unauthorizedResponse() {
  return new Response("Unauthorized", { status: 401 })
}
