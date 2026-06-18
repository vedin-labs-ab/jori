import { googleJson } from "../../../../providers/google/api"
import {
  boundedNumber,
  requiredString,
  requiredStringArray,
  setOptionalSearchParam,
} from "../../../../shared/input"
import { normalizeGmailFormat } from "../format"

const maxBatchReadIds = 50

export async function searchGmailThreads(
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

export async function getGmailThread(
  token: string,
  args: Record<string, unknown>
) {
  const url = new URL(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(requiredString(args.threadId, "threadId"))}`
  )
  url.searchParams.set("format", normalizeGmailFormat(args.format))
  return await googleJson(token, url.toString())
}

export async function getGmailThreads(
  token: string,
  args: Record<string, unknown>
) {
  const threads = []

  for (const threadId of requiredGmailIds(args.threadIds, "threadIds")) {
    threads.push(
      await getGmailThread(token, {
        threadId,
        format: args.format,
      })
    )
  }

  return threads
}

export async function getGmailMessage(
  token: string,
  args: Record<string, unknown>
) {
  const url = new URL(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(requiredString(args.messageId, "messageId"))}`
  )
  url.searchParams.set("format", normalizeGmailFormat(args.format))
  return await googleJson(token, url.toString())
}

export async function getGmailMessages(
  token: string,
  args: Record<string, unknown>
) {
  const messages = []

  for (const messageId of requiredGmailIds(args.messageIds, "messageIds")) {
    messages.push(
      await getGmailMessage(token, {
        messageId,
        format: args.format,
      })
    )
  }

  return messages
}

function requiredGmailIds(value: unknown, name: string) {
  const ids = requiredStringArray(value, name)
    .map((id) => id.trim())
    .filter(Boolean)

  if (ids.length === 0) {
    throw new Error(`${name} is required`)
  }

  if (ids.length > maxBatchReadIds) {
    throw new Error(`${name} can include at most ${maxBatchReadIds} IDs`)
  }

  return ids
}
