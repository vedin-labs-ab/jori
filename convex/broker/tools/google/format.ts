import { base64EncodeBytes, base64UrlEncode } from "../../../shared/encoding"
import { optionalString, readArray, readRecord } from "../../../shared/input"

export function getHeader(message: Record<string, unknown>, name: string) {
  const payload = readObject(message.payload)
  const value = readArray(payload.headers)
    .map(readRecord)
    .find(
      (header) => String(header.name).toLowerCase() === name.toLowerCase()
    )?.value

  return typeof value === "string" ? value : undefined
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
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  bodyType?: "HTML" | "Text"
  inReplyTo?: string
  references?: string
  attachments?: Array<{
    name: string
    mimeType: string
    bytes: Uint8Array
  }>
}) {
  const headers = [
    ["To", args.to.join(", ")],
    ...messageAddressHeaders("Cc", args.cc),
    ...messageAddressHeaders("Bcc", args.bcc),
    ["Subject", args.subject],
    ["MIME-Version", "1.0"],
  ]

  if (args.inReplyTo !== undefined) {
    headers.push(["In-Reply-To", args.inReplyTo])
  }

  if (args.references !== undefined) {
    headers.push(["References", args.references])
  }

  if (args.attachments !== undefined && args.attachments.length > 0) {
    return base64UrlEncode(
      createMultipartMimeMessage({
        headers,
        body: args.body,
        bodyType: args.bodyType,
        attachments: args.attachments,
      })
    )
  }

  headers.push([
    "Content-Type",
    `${args.bodyType === "HTML" ? "text/html" : "text/plain"}; charset=UTF-8`,
  ])

  return base64UrlEncode(
    [
      ...headers.map(([name, value]) => `${name}: ${value}`),
      "",
      args.body,
    ].join("\r\n")
  )
}

function createMultipartMimeMessage(args: {
  headers: string[][]
  body: string
  bodyType?: "HTML" | "Text"
  attachments: Array<{
    name: string
    mimeType: string
    bytes: Uint8Array
  }>
}) {
  const boundary = `jori-${crypto.randomUUID()}`
  const bodyContentType = args.bodyType === "HTML" ? "text/html" : "text/plain"
  const parts = [
    ...args.headers,
    ["Content-Type", `multipart/mixed; boundary="${boundary}"`],
    "",
    `--${boundary}`,
    `Content-Type: ${bodyContentType}; charset=UTF-8`,
    "",
    args.body,
    ...args.attachments.flatMap((attachment) => [
      `--${boundary}`,
      `Content-Type: ${attachment.mimeType}; name="${escapeHeaderParameter(attachment.name)}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${escapeHeaderParameter(attachment.name)}"`,
      "",
      wrapBase64(base64EncodeBytes(attachment.bytes)),
    ]),
    `--${boundary}--`,
    "",
  ]

  return parts
    .map((part) => (Array.isArray(part) ? `${part[0]}: ${part[1]}` : part))
    .join("\r\n")
}

function wrapBase64(value: string) {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? ""
}

function escapeHeaderParameter(value: string) {
  return value.replace(/[\r\n"]/g, "_")
}

function messageAddressHeaders(name: string, addresses: string[] | undefined) {
  return addresses === undefined || addresses.length === 0
    ? []
    : [[name, addresses.join(", ")]]
}

export function getCalendarId(args: Record<string, unknown>) {
  return optionalString(args.calendarId) ?? "primary"
}

function readObject(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {}
}
