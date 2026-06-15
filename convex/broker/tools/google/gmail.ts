import { type Doc } from "../../../_generated/dataModel"
import {
  type ArtifactContext,
  readArtifactAttachments,
} from "../../../artifacts/attachments"
import {
  boundedNumber,
  optionalStringArray,
  requiredString,
  requiredStringArray,
  setOptionalSearchParam,
} from "../common"
import {
  createMimeMessage,
  ensureReplySubject,
  getHeader,
  getReplyRecipient,
  normalizeGmailFormat,
  parseOptionalEmailAddress,
} from "./format"
import { googleJson } from "./request"

export async function callGmailTool(
  integration: Doc<"integrations">,
  token: string,
  tool: string,
  args: Record<string, unknown>,
  context?: ArtifactContext
) {
  if (tool === "google_gmail_search_threads") {
    return await searchGmailThreads(token, args)
  }

  if (tool === "google_gmail_get_thread") {
    return await getGmailThread(token, args)
  }

  if (tool === "google_gmail_get_message") {
    return await getGmailMessage(token, args)
  }

  if (tool === "google_gmail_reply_to_thread") {
    return await replyToGmailThread(integration, token, args)
  }

  if (tool === "google_gmail_send_message") {
    return await sendGmailMessage(token, args, context)
  }

  if (tool === "google_gmail_create_draft") {
    return await createGmailDraft(token, args, context)
  }

  throw new Error(`Unknown Gmail tool: ${tool}`)
}

async function searchGmailThreads(
  token: string,
  args: Record<string, unknown>
) {
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/threads")
  url.searchParams.set(
    "maxResults",
    String(boundedNumber(args.maxResults, 10, 1, 50))
  )
  setOptionalSearchParam(url, "q", args.q)
  return await googleJson(token, url.toString())
}

async function getGmailThread(token: string, args: Record<string, unknown>) {
  const url = new URL(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(requiredString(args.threadId, "threadId"))}`
  )
  url.searchParams.set("format", normalizeGmailFormat(args.format))
  return await googleJson(token, url.toString())
}

async function getGmailMessage(token: string, args: Record<string, unknown>) {
  const url = new URL(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(requiredString(args.messageId, "messageId"))}`
  )
  url.searchParams.set("format", normalizeGmailFormat(args.format))
  return await googleJson(token, url.toString())
}

async function replyToGmailThread(
  integration: Doc<"integrations">,
  token: string,
  args: Record<string, unknown>
) {
  const threadId = requiredString(args.threadId, "threadId")
  const thread = await googleJson(
    token,
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=metadata`
  )
  const accountEmail = requireIntegrationEmail(integration)
  const messages = [...(thread.messages ?? [])].sort(
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

  return await googleJson(
    token,
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      body: {
        raw: createMimeMessage({
          to: [
            getReplyRecipient(
              latestMessage,
              latestExternalMessage !== undefined
            ),
          ],
          subject: ensureReplySubject(
            getHeader(latestMessage, "subject") ?? ""
          ),
          body: requiredString(args.body, "body"),
          inReplyTo: messageId,
          references,
        }),
        threadId,
      },
    }
  )
}

async function sendGmailMessage(
  token: string,
  args: Record<string, unknown>,
  context?: ArtifactContext
) {
  return await googleJson(
    token,
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      body: {
        raw: createMimeMessage({
          ...gmailMessageInput(args),
          attachments: await readArtifactAttachments(context, args.attachments),
        }),
      },
    }
  )
}

async function createGmailDraft(
  token: string,
  args: Record<string, unknown>,
  context?: ArtifactContext
) {
  return await googleJson(
    token,
    "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
    {
      method: "POST",
      body: {
        message: {
          raw: createMimeMessage({
            ...gmailMessageInput(args),
            attachments: await readArtifactAttachments(
              context,
              args.attachments
            ),
          }),
        },
      },
    }
  )
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

  throw new Error(`${integration.provider} integration is missing email`)
}
