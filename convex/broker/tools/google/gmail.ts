import { type Doc } from "../../../_generated/dataModel"
import {
  type AttachmentContext,
  readAttachments,
} from "../../../files/attachments"
import { googleJson } from "../../../integrations/google/api"
import {
  optionalString,
  optionalStringArray,
  readArray,
  readRecord,
  requiredString,
  requiredStringArray,
} from "../../../shared/input"
import {
  createMimeMessage,
  ensureReplySubject,
  getHeader,
  getReplyRecipient,
  parseOptionalEmailAddress,
} from "./format"
import { gmailDraftResult, gmailSentResult } from "./mail"
import {
  getGmailMessage,
  getGmailMessages,
  getGmailThread,
  getGmailThreads,
  searchGmailThreads,
} from "./read"

export async function callGmailTool(
  integration: Doc<"integrations">,
  token: string,
  tool: string,
  args: Record<string, unknown>,
  context?: AttachmentContext
) {
  if (tool === "google_gmail_search_threads") {
    return await searchGmailThreads(token, args)
  }

  if (tool === "google_gmail_get_thread") {
    return await getGmailThread(token, args)
  }

  if (tool === "google_gmail_get_threads") {
    return await getGmailThreads(token, args)
  }

  if (tool === "google_gmail_get_message") {
    return await getGmailMessage(token, args)
  }

  if (tool === "google_gmail_get_messages") {
    return await getGmailMessages(token, args)
  }

  if (tool === "google_gmail_reply_to_thread") {
    return await replyToGmailThread(integration, token, args)
  }

  if (tool === "google_gmail_send_message") {
    return await sendGmailMessage(token, args, context)
  }

  if (tool === "google_gmail_create_draft") {
    return await createGmailDraft(integration, token, args, context)
  }

  throw new Error(`Unknown Gmail tool: ${tool}`)
}

async function replyToGmailThread(
  integration: Doc<"integrations">,
  token: string,
  args: Record<string, unknown>
) {
  const threadId = requiredString(args.threadId, "threadId")
  const reply = await readGmailReplyContext(integration, token, threadId)

  return gmailSentResult(
    await googleJson(
      token,
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        body: {
          raw: createMimeMessage({
            to: reply.to,
            subject: reply.subject,
            body: requiredString(args.body, "body"),
            inReplyTo: reply.inReplyTo,
            references: reply.references,
          }),
          threadId,
        },
      }
    )
  )
}

async function sendGmailMessage(
  token: string,
  args: Record<string, unknown>,
  context?: AttachmentContext
) {
  return gmailSentResult(
    await googleJson(
      token,
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        body: {
          raw: createMimeMessage({
            ...gmailMessageInput(args),
            attachments: await readAttachments(context, args.files),
          }),
        },
      }
    )
  )
}

async function createGmailDraft(
  integration: Doc<"integrations">,
  token: string,
  args: Record<string, unknown>,
  context?: AttachmentContext
) {
  const threadId = optionalString(args.threadId)

  if (threadId !== undefined) {
    return await createGmailThreadDraft(
      integration,
      token,
      threadId,
      args,
      context
    )
  }

  return gmailDraftResult(
    await googleJson(
      token,
      "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
      {
        method: "POST",
        body: {
          message: {
            raw: createMimeMessage({
              ...gmailMessageInput(args),
              attachments: await readAttachments(context, args.files),
            }),
          },
        },
      }
    )
  )
}

async function createGmailThreadDraft(
  integration: Doc<"integrations">,
  token: string,
  threadId: string,
  args: Record<string, unknown>,
  context?: AttachmentContext
) {
  const reply = await readGmailReplyContext(integration, token, threadId)

  return gmailDraftResult(
    await googleJson(
      token,
      "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
      {
        method: "POST",
        body: {
          message: {
            raw: createMimeMessage({
              to: reply.to,
              subject: reply.subject,
              body: requiredString(args.body, "body"),
              bodyType: args.bodyType === "HTML" ? "HTML" : "Text",
              inReplyTo: reply.inReplyTo,
              references: reply.references,
              attachments: await readAttachments(context, args.files),
            }),
            threadId,
          },
        },
      }
    )
  )
}

async function readGmailReplyContext(
  integration: Doc<"integrations">,
  token: string,
  threadId: string
) {
  const thread = await googleJson(
    token,
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=metadata`
  )
  const accountEmail = requireIntegrationEmail(integration)
  const messages = readArray(thread.messages)
    .map(readRecord)
    .sort(
      (left, right) =>
        Number(left.internalDate ?? 0) - Number(right.internalDate ?? 0)
    )
  const latestExternalMessage = [...messages].reverse().find((message) => {
    const from = parseOptionalEmailAddress(getHeader(message, "from"))

    return (
      from !== undefined && from.toLowerCase() !== accountEmail.toLowerCase()
    )
  })
  const latestMessage = latestExternalMessage ?? messages.at(-1)

  if (latestMessage === undefined) {
    throw new Error("Cannot reply to an empty Gmail thread")
  }

  const messageId = getHeader(latestMessage, "message-id")
  const references = [getHeader(latestMessage, "references"), messageId]
    .filter(Boolean)
    .join(" ")

  return {
    to: [getReplyRecipient(latestMessage, latestExternalMessage !== undefined)],
    subject: ensureReplySubject(getHeader(latestMessage, "subject") ?? ""),
    inReplyTo: messageId,
    references,
  }
}

function gmailMessageInput(args: Record<string, unknown>) {
  return {
    to: requiredAddressList(args.to, "to"),
    cc: optionalAddressList(args.cc),
    bcc: optionalAddressList(args.bcc),
    subject: requiredString(args.subject, "subject"),
    body: requiredString(args.body, "body"),
    bodyType: args.bodyType === "HTML" ? ("HTML" as const) : ("Text" as const),
  }
}

function requiredAddressList(value: unknown, name: string) {
  const addresses = normalizeAddressList(requiredStringArray(value, name))

  if (addresses.length === 0) {
    throw new Error(`${name} is required`)
  }

  return addresses
}

function optionalAddressList(value: unknown) {
  return normalizeAddressList(optionalStringArray(value))
}

function normalizeAddressList(addresses: string[]) {
  return addresses.map((address) => address.trim()).filter(Boolean)
}

function requireIntegrationEmail(integration: Doc<"integrations">) {
  if (integration.email !== undefined) {
    return integration.email
  }

  throw new Error(`${integration.integration} integration is missing email`)
}
