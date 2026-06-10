import { base64UrlEncode, optionalString } from "../common"

export function getHeader(message: Record<string, unknown>, name: string) {
  const payload = readObject(message.payload)

  return readArray(payload.headers).find(
    (header: Record<string, unknown>) =>
      String(header.name).toLowerCase() === name.toLowerCase()
  )?.value
}

export function getReplyRecipient(
  message: Record<string, unknown>,
  isExternalMessage: boolean
) {
  if (isExternalMessage) {
    return parseEmailAddress(getHeader(message, "from"))
  }

  return parseEmailAddress(
    getHeader(message, "to") ?? getHeader(message, "from")
  )
}

export function parseEmailAddress(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Cannot determine reply recipient")
  }

  return parseOptionalEmailAddress(value) ?? value
}

export function parseOptionalEmailAddress(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined
  }

  const match = value.match(/<([^>]+)>/)
  return match?.[1] ?? value.trim()
}

export function ensureReplySubject(subject: string) {
  return /^re:/i.test(subject) ? subject : `Re: ${subject}`
}

export function createMimeMessage(args: {
  to: string
  subject: string
  body: string
  inReplyTo?: string
  references?: string
}) {
  const headers = [
    ["To", args.to],
    ["Subject", args.subject],
    ["MIME-Version", "1.0"],
    ["Content-Type", "text/plain; charset=UTF-8"],
  ]

  if (args.inReplyTo !== undefined) {
    headers.push(["In-Reply-To", args.inReplyTo])
  }

  if (args.references !== undefined) {
    headers.push(["References", args.references])
  }

  return base64UrlEncode(
    [
      ...headers.map(([name, value]) => `${name}: ${value}`),
      "",
      args.body,
    ].join("\r\n")
  )
}

export function normalizeGmailFormat(value: unknown) {
  return value === "metadata" || value === "minimal" ? value : "full"
}

export function getCalendarId(args: Record<string, unknown>) {
  return optionalString(args.calendarId) ?? "primary"
}

function readObject(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {}
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : []
}
