import { googleJson } from "../../../integrations/google/api"
import { listGoogleCalendars } from "../../../integrations/google/calendars"
import {
  boundedNumber,
  optionalString,
  readArray,
  readRecord,
  requiredObject,
  requiredString,
  setOptionalSearchParam,
} from "../../../shared/input"
import { getCalendarId } from "./format"

export async function callGoogleCalendarTool(
  token: string,
  tool: string,
  args: Record<string, unknown>
) {
  if (tool === "google_calendar_list_calendars") {
    return await listCalendars(token, args)
  }
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

async function listCalendars(token: string, args: Record<string, unknown>) {
  return await listGoogleCalendars(token, {
    maxResults: boundedNumber(args.maxResults, 100, 1, 100),
    pageToken: optionalString(args.pageToken),
  })
}

async function listCalendarEvents(
  token: string,
  args: Record<string, unknown>
) {
  const calendarId = optionalString(args.calendarId)

  return calendarId === undefined
    ? await listAllCalendarEvents(token, args)
    : await listCalendarEventPage(token, args, calendarId)
}

async function listAllCalendarEvents(
  token: string,
  args: Record<string, unknown>
) {
  const limit = boundedNumber(args.maxResults, 250, 1, 250)
  const calendarPage = readRecord(
    await listGoogleCalendars(token, {
      maxResults: 100,
      minAccessRole: "reader",
      showHidden: true,
    })
  )
  const calendars = readArray(calendarPage.items).map(readRecord)
  const items: Record<string, unknown>[] = []
  const gaps: string[] = []
  let truncated = optionalString(calendarPage.nextPageToken) !== undefined
  let calendarsScanned = 0

  for (const calendar of calendars) {
    const calendarId = optionalString(calendar.id)
    if (calendarId === undefined) {
      continue
    }
    if (items.length >= limit) {
      truncated = true
      break
    }

    const calendarName = optionalString(calendar.summary)
    try {
      const result = await scanGoogleCalendar(token, args, {
        calendarId,
        calendarName,
        limit: limit - items.length,
      })
      items.push(...result.items)
      truncated ||= result.truncated
      calendarsScanned += 1
    } catch {
      gaps.push(`Could not read ${calendarName ?? "one calendar"}.`)
    }
  }

  return {
    items: sortGoogleEvents(items),
    calendarsScanned,
    gaps: gaps.slice(0, 10),
    status: gaps.length > 0 || truncated ? "partial" : "ready",
    truncated,
  }
}

async function scanGoogleCalendar(
  token: string,
  args: Record<string, unknown>,
  calendar: { calendarId: string; calendarName?: string; limit: number }
) {
  const items: Record<string, unknown>[] = []
  let pageToken: string | undefined

  do {
    const page = readRecord(
      await listCalendarEventPage(
        token,
        { ...args, maxResults: calendar.limit - items.length, pageToken },
        calendar.calendarId
      )
    )
    const pageItems = readArray(page.items)
      .map(readRecord)
      .slice(0, calendar.limit - items.length)
      .map((event) => ({
        ...event,
        calendarId: calendar.calendarId,
        calendarName: calendar.calendarName,
      }))
    items.push(...pageItems)
    pageToken = optionalString(page.nextPageToken)
  } while (pageToken !== undefined && items.length < calendar.limit)

  return { items, truncated: pageToken !== undefined }
}

async function listCalendarEventPage(
  token: string,
  args: Record<string, unknown>,
  calendarId: string
) {
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  )
  url.searchParams.set(
    "maxResults",
    String(boundedNumber(args.maxResults, 100, 1, 250))
  )
  for (const key of ["timeMin", "timeMax", "q", "orderBy", "pageToken"]) {
    setOptionalSearchParam(url, key, args[key])
  }
  if (typeof args.singleEvents === "boolean") {
    url.searchParams.set("singleEvents", String(args.singleEvents))
  }
  return await googleJson(token, url.toString())
}

function sortGoogleEvents(events: Record<string, unknown>[]) {
  return events.sort((left, right) =>
    googleEventStart(left).localeCompare(googleEventStart(right))
  )
}

function googleEventStart(event: Record<string, unknown>) {
  const start = readRecord(event.start)
  return optionalString(start.dateTime) ?? optionalString(start.date) ?? ""
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
