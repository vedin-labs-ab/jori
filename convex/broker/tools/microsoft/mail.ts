import { optionalString, readArray, readRecord } from "../../../shared/input"
import {
  boundedMailBody,
  draftedMailResult,
  type MailAttachment,
  type MailMessage,
} from "../mail"

// Microsoft Graph is shaped server-side: $select trims listings to the
// normalized fields, and the Prefer header returns bodies as plain text.

const messageSelect =
  "id,conversationId,from,toRecipients,ccRecipients,subject,receivedDateTime,bodyPreview,isRead,hasAttachments"

export const microsoftMessageListQuery = { $select: messageSelect }

export const microsoftMessageReadQuery = {
  $select: `${messageSelect},body`,
  $expand: "attachments($select=id,name,contentType,size)",
}

export const microsoftTextBodyHeaders = {
  prefer: 'outlook.body-content-type="text"',
}

/** A Graph message in the normalized mail shape. Bodies and attachments
 *  appear only when the request selected them. */
export function microsoftMailMessage(
  message: Record<string, unknown>
): MailMessage {
  const body = readRecord(message.body)
  const bodyContent = optionalString(body.content)
  const attachments =
    message.attachments === undefined
      ? undefined
      : readArray(message.attachments)
          .map(readRecord)
          .map(microsoftMailAttachment)

  return {
    provider: "microsoftEmail",
    messageId: optionalString(message.id) ?? "",
    threadId: optionalString(message.conversationId),
    from: microsoftAddress(message.from),
    to: microsoftAddresses(message.toRecipients),
    cc: microsoftAddresses(message.ccRecipients),
    subject: optionalString(message.subject) ?? "",
    date: optionalString(message.receivedDateTime),
    snippet: optionalString(message.bodyPreview),
    ...(typeof message.isRead === "boolean" ? { unread: !message.isRead } : {}),
    ...(bodyContent === undefined
      ? {}
      : boundedMailBody(
          bodyContent,
          body.contentType === "html" ? "html" : "text"
        )),
    ...(attachments === undefined ? {} : { attachments }),
    ...(typeof message.hasAttachments === "boolean"
      ? { hasAttachments: message.hasAttachments }
      : {}),
  }
}

export function microsoftDraftResult(message: Record<string, unknown>) {
  const messageId = optionalString(message.id) ?? ""

  return draftedMailResult({
    draftId: messageId,
    messageId,
    threadId: optionalString(message.conversationId),
  })
}

function microsoftMailAttachment(
  attachment: Record<string, unknown>
): MailAttachment {
  return {
    ...(optionalString(attachment.id) === undefined
      ? {}
      : { attachmentId: optionalString(attachment.id) }),
    name: optionalString(attachment.name) ?? "",
    ...(optionalString(attachment.contentType) === undefined
      ? {}
      : { mimeType: optionalString(attachment.contentType) }),
    ...(typeof attachment.size === "number" ? { size: attachment.size } : {}),
  }
}

function microsoftAddresses(value: unknown) {
  return readArray(value)
    .map((recipient) => microsoftAddress(recipient))
    .filter((address): address is string => address !== undefined)
}

function microsoftAddress(value: unknown) {
  const emailAddress = readRecord(readRecord(value).emailAddress)
  const address = optionalString(emailAddress.address)
  const name = optionalString(emailAddress.name)

  if (address === undefined) {
    return undefined
  }

  return name === undefined || name === address
    ? address
    : `${name} <${address}>`
}
