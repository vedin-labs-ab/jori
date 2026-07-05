import { type Doc } from "../../../_generated/dataModel"
import { googleJson } from "../../../providers/google/api"
import { requireGoogleCredentials } from "../../../providers/google/credentials"
import {
  boundedNumber,
  requiredObject,
  requiredString,
  setOptionalSearchParam,
} from "../../../shared/input"
import { type ProviderToolContext } from "../context"
import { getCalendarId } from "./format"
import { callGmailTool } from "./gmail"

export async function callGoogleTool(
  integration: Doc<"integrations">,
  tool: string,
  args: Record<string, unknown>,
  context?: ProviderToolContext
) {
  const credentials = requireGoogleCredentials(integration)

  if (tool.startsWith("google_gmail_")) {
    return await callGmailTool(
      integration,
      credentials.tokens.access,
      tool,
      args,
      context
    )
  }

  if (tool.startsWith("google_calendar_")) {
    return await callGoogleCalendarTool(credentials.tokens.access, tool, args)
  }

  throw new Error(`Unknown Google tool: ${tool}`)
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
