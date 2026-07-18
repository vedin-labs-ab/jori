import { compactRecord } from "../../../contracts/json"
// One normalized message shape for every mail provider. Provider payloads
// (Gmail MIME trees, Microsoft Graph messages) are mapped into it at the
// provider edges, so agents read one compact form regardless of account.

export type MailAttachment = {
  attachmentId?: string
  name: string
  mimeType?: string
  size?: number
}

export type MailMessage = {
  provider: "gmail" | "microsoftEmail"
  messageId: string
  threadId?: string
  from?: string
  to: string[]
  cc: string[]
  subject: string
  date?: string
  snippet?: string
  unread?: boolean
  body?: string
  bodyType?: "text" | "html"
  bodyTruncated?: boolean
  attachments?: MailAttachment[]
  hasAttachments?: boolean
}

export const maxMailBodyChars = 20_000

export function boundedMailBody(content: string, type: "text" | "html") {
  const trimmed = content.replace(/\r\n/g, "\n").trim()

  if (trimmed === "") {
    return {}
  }

  return {
    body: trimmed.slice(0, maxMailBodyChars),
    bodyType: type,
    ...(trimmed.length > maxMailBodyChars ? { bodyTruncated: true } : {}),
  }
}

export function sentMailResult(ids: { messageId?: string; threadId?: string }) {
  return compactRecord({ status: "sent" as const, ...ids })
}

export function draftedMailResult(ids: {
  draftId: string
  messageId?: string
  threadId?: string
}) {
  return compactRecord({ status: "drafted" as const, ...ids })
}

/** Split an address header on commas, respecting quoted display names. */
export function splitMailAddressList(value: unknown): string[] {
  if (typeof value !== "string") {
    return []
  }

  const addresses: string[] = []
  let current = ""
  let quoted = false

  for (const character of value) {
    if (character === '"') {
      quoted = !quoted
    }

    if (character === "," && !quoted) {
      addresses.push(current)
      current = ""
      continue
    }

    current += character
  }

  addresses.push(current)

  return addresses.map((address) => address.trim()).filter(Boolean)
}
