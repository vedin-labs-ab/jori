import { type Doc } from "../../_generated/dataModel"
import { requireGoogleCredentials } from "../../providers/google/credentials"
import {
  boundedNumber,
  fetchJson,
  requiredObject,
  requiredString,
  setOptionalSearchParam,
} from "./common"
import {
  createMimeMessage,
  ensureReplySubject,
  getCalendarId,
  getHeader,
  getReplyRecipient,
  normalizeGmailFormat,
  parseOptionalEmailAddress,
} from "./googleFormat"

export async function callGoogleTool(
  integration: Doc<"integrations">,
  tool: string,
  args: Record<string, unknown>
) {
  const credentials = requireGoogleCredentials(integration)

  if (tool.startsWith("google_gmail_")) {
    return await callGmailTool(integration, credentials.accessToken, tool, args)
  }

  if (tool.startsWith("google_calendar_")) {
    return await callGoogleCalendarTool(credentials.accessToken, tool, args)
  }

  throw new Error(`Unknown Google tool: ${tool}`)
}

async function callGmailTool(
  integration: Doc<"integrations">,
  token: string,
  tool: string,
  args: Record<string, unknown>
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

  throw new Error(`Unknown Gmail tool: ${tool}`)
}

async function callGoogleCalendarTool(
  token: string,
  tool: string,
  args: Record<string, unknown>
) {
  if (tool === "google_calendar_list_events") {
    return await listCalendarEvents(token, args)
  }

  if (tool === "google_calendar_get_event") {
    return await getCalendarEvent(token, args)
  }

  if (tool === "google_calendar_create_event") {
    return await createCalendarEvent(token, args)
  }

  if (tool === "google_calendar_update_event") {
    return await updateCalendarEvent(token, args)
  }

  throw new Error(`Unknown Google Calendar tool: ${tool}`)
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

async function listCalendarEvents(
  token: string,
  args: Record<string, unknown>
) {
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(getCalendarId(args))}/events`
  )
  url.searchParams.set(
    "maxResults",
    String(boundedNumber(args.maxResults, 10, 1, 50))
  )
  for (const key of ["timeMin", "timeMax", "q", "orderBy"]) {
    setOptionalSearchParam(url, key, args[key])
  }
  if (typeof args.singleEvents === "boolean") {
    url.searchParams.set("singleEvents", String(args.singleEvents))
  }
  return await googleJson(token, url.toString())
}

async function getCalendarEvent(token: string, args: Record<string, unknown>) {
  return await googleJson(
    token,
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(getCalendarId(args))}/events/${encodeURIComponent(requiredString(args.eventId, "eventId"))}`
  )
}

async function createCalendarEvent(
  token: string,
  args: Record<string, unknown>
) {
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(getCalendarId(args))}/events`
  )
  setOptionalSearchParam(url, "sendUpdates", args.sendUpdates)
  return await googleJson(token, url.toString(), {
    method: "POST",
    body: requiredObject(args.event, "event"),
  })
}

async function updateCalendarEvent(
  token: string,
  args: Record<string, unknown>
) {
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(getCalendarId(args))}/events/${encodeURIComponent(requiredString(args.eventId, "eventId"))}`
  )
  setOptionalSearchParam(url, "sendUpdates", args.sendUpdates)
  return await googleJson(token, url.toString(), {
    method: "PATCH",
    body: requiredObject(args.event, "event"),
  })
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
  const accountEmail = integration.accountId
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
          to: getReplyRecipient(
            latestMessage,
            latestExternalMessage !== undefined
          ),
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

async function googleJson(
  token: string,
  url: string,
  options: { method?: string; body?: unknown } = {}
) {
  return await fetchJson(url, {
    method: options.method ?? "GET",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: options.body,
  })
}
