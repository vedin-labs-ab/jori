import { compactRecord } from "../../../../contracts/json"
import { base64UrlDecode } from "../../../shared/encoding"
import {
  optionalString,
  readArray,
  readRecord,
  requiredString,
} from "../../../shared/input"
import {
  boundedMailBody,
  draftedMailResult,
  type MailAttachment,
  type MailMessage,
  sentMailResult,
  splitMailAddressList,
} from "../mail"
import { getHeader } from "./format"

export function gmailSentResult(response: Record<string, unknown>) {
  return sentMailResult({
    messageId: optionalString(response.id),
    threadId: optionalString(response.threadId),
  })
}

export function gmailDraftResult(response: Record<string, unknown>) {
  const message = readRecord(response.message)

  return draftedMailResult({
    draftId: requiredString(response.id, "Gmail draft id"),
    messageId: optionalString(message.id),
    threadId: optionalString(message.threadId),
  })
}

/** A Gmail message in the normalized mail shape: headers lifted out of the
 *  MIME tree, the best body part decoded, attachments summarized. */
export function gmailMailMessage(
  message: Record<string, unknown>
): MailMessage {
  const payload = readRecord(message.payload)
  const body = gmailBodyPart(payload)

  return compactRecord({
    provider: "gmail",
    messageId: optionalString(message.id) ?? "",
    threadId: optionalString(message.threadId),
    from: optionalString(getHeader(message, "from")),
    to: splitMailAddressList(getHeader(message, "to")),
    cc: splitMailAddressList(getHeader(message, "cc")),
    subject: optionalString(getHeader(message, "subject")) ?? "",
    date: gmailDate(message.internalDate),
    snippet: optionalString(message.snippet),
    unread: readArray(message.labelIds).includes("UNREAD"),
    ...(body === undefined
      ? {}
      : boundedMailBody(base64UrlDecode(body.data), body.type)),
    attachments: gmailAttachments(payload),
  })
}

export function gmailMailThread(thread: Record<string, unknown>) {
  return {
    threadId: optionalString(thread.id) ?? "",
    messages: readArray(thread.messages)
      .map(readRecord)
      .map((message) => gmailMailMessage(message)),
  }
}

export function gmailThreadSearchPage(page: Record<string, unknown>) {
  return compactRecord({
    threads: readArray(page.threads)
      .map(readRecord)
      .map((thread) =>
        compactRecord({
          threadId: optionalString(thread.id) ?? "",
          snippet: optionalString(thread.snippet),
        })
      ),
    nextPageToken: optionalString(page.nextPageToken),
  })
}

function gmailDate(internalDate: unknown) {
  const epoch = Number(optionalString(internalDate))

  return Number.isFinite(epoch) && epoch > 0
    ? new Date(epoch).toISOString()
    : undefined
}

/** The best readable body part: text/plain when present, text/html next. */
function gmailBodyPart(
  payload: Record<string, unknown>
): { data: string; type: "text" | "html" } | undefined {
  const plain = findGmailPart(payload, "text/plain")

  if (plain !== undefined) {
    return { data: plain, type: "text" }
  }

  const html = findGmailPart(payload, "text/html")

  return html === undefined ? undefined : { data: html, type: "html" }
}

function findGmailPart(
  part: Record<string, unknown>,
  mimeType: string
): string | undefined {
  const data = optionalString(readRecord(part.body).data)

  if (part.mimeType === mimeType && data !== undefined) {
    return data
  }

  for (const child of readArray(part.parts)) {
    const found = findGmailPart(readRecord(child), mimeType)

    if (found !== undefined) {
      return found
    }
  }

  return undefined
}

function gmailAttachments(
  part: Record<string, unknown>,
  attachments: MailAttachment[] = []
): MailAttachment[] {
  const name = optionalString(part.filename)
  const body = readRecord(part.body)

  if (name !== undefined) {
    attachments.push(
      compactRecord({
        attachmentId: optionalString(body.attachmentId),
        name,
        mimeType: optionalString(part.mimeType),
        size: typeof body.size === "number" ? body.size : undefined,
      })
    )
  }

  for (const child of readArray(part.parts)) {
    gmailAttachments(readRecord(child), attachments)
  }

  return attachments
}
