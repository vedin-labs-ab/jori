import { googleJson } from "../../../integrations/google/api"
import {
  boundedNumber,
  requiredString,
  requiredStringArray,
  setOptionalSearchParam,
} from "../../../shared/input"
import {
  gmailMailMessage,
  gmailMailThread,
  gmailThreadSearchPage,
} from "./mail"

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
  setOptionalSearchParam(url, "pageToken", args.pageToken)

  return gmailThreadSearchPage(await googleJson(token, url.toString()))
}

export async function getGmailThread(
  token: string,
  args: Record<string, unknown>
) {
  return gmailMailThread(
    await googleJson(
      token,
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(requiredString(args.threadId, "threadId"))}?format=full`
    )
  )
}

export async function getGmailThreads(
  token: string,
  args: Record<string, unknown>
) {
  const threads = []

  for (const threadId of requiredGmailIds(args.threadIds, "threadIds")) {
    threads.push(await getGmailThread(token, { threadId }))
  }

  return threads
}

export async function getGmailMessage(
  token: string,
  args: Record<string, unknown>
) {
  return gmailMailMessage(
    await googleJson(
      token,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(requiredString(args.messageId, "messageId"))}?format=full`
    )
  )
}

export async function getGmailMessages(
  token: string,
  args: Record<string, unknown>
) {
  const messages = []

  for (const messageId of requiredGmailIds(args.messageIds, "messageIds")) {
    messages.push(await getGmailMessage(token, { messageId }))
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
