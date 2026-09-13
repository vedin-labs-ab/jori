import { compactRecord } from "../../../../contracts/json"
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
import {
  type CalendarEventContent,
  scanCalendarEvents,
  stampCalendarEvent,
} from "../events"
import { listGoogleCalendarSummaries } from "./calendars"
import { getCalendarId } from "./format"

export async function callGoogleCalendarTool(
  token: string,
  tool: string,
  args: Record<string, unknown>
) {
  if (tool === "google_calendar_list_calendars") {
    return await listGoogleCalendarSummaries(token, args)
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

async function listCalendarEvents(
  token: string,
  args: Record<string, unknown>
) {
  const calendarId = optionalString(args.calendarId)

  if (calendarId === undefined) {
    return await listAllCalendarEvents(token, args)
  }

  const page = readRecord(await listCalendarEventPage(token, args, calendarId))
  const nextPageToken = optionalString(page.nextPageToken)

  return compactRecord({
    events: await Promise.all(
      readArray(page.items).map((event) =>
        stampGoogleEvent(readRecord(event), calendarId)
      )
    ),
    status: nextPageToken === undefined ? "ready" : "partial",
    truncated: nextPageToken !== undefined,
    nextPageToken,
  })
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
  return await scanCalendarEvents({
    calendars: readArray(calendarPage.items).map((value) => {
      const calendar = readRecord(value)
      return {
        calendarId: optionalString(calendar.id),
        calendarName: optionalString(calendar.summary),
      }
    }),
    limit,
    truncated: optionalString(calendarPage.nextPageToken) !== undefined,
    scan: (calendar) => scanGoogleCalendar(token, args, calendar),
    eventTime: (event) => googleEventTime(event.start),
  })
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
    const pageItems = await Promise.all(
      readArray(page.items)
        .map(readRecord)
        .slice(0, calendar.limit - items.length)
        .map((event) =>
          stampGoogleEvent(
            {
              ...event,
              calendarId: calendar.calendarId,
              calendarName: calendar.calendarName,
            },
            calendar.calendarId
          )
        )
    )
    items.push(...pageItems)
    pageToken = optionalString(page.nextPageToken)
  } while (pageToken !== undefined && items.length < calendar.limit)

  return { events: items, truncated: pageToken !== undefined }
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

function googleEventTime(value: unknown) {
  const time = readRecord(value)
  return optionalString(time.dateTime) ?? optionalString(time.date) ?? ""
}

async function stampGoogleEvent(
  event: Record<string, unknown>,
  calendarId: string | undefined
) {
  return await stampCalendarEvent(
    event,
    {
      provider: "googleCalendar",
      calendarId,
      eventId: optionalString(event.id) ?? "",
    },
    googleEventContent(event)
  )
}

function googleEventContent(
  event: Record<string, unknown>
): CalendarEventContent {
  return {
    title: optionalString(event.summary) ?? "",
    start: googleEventTime(event.start),
    end: googleEventTime(event.end),
    status: optionalString(event.status) ?? "",
    description: optionalString(event.description) ?? "",
    organizer: optionalString(readRecord(event.organizer).email) ?? "",
    attendees: readArray(event.attendees).map(
      (attendee) => optionalString(readRecord(attendee).email) ?? ""
    ),
  }
}

async function getCalendarEvent(token: string, args: Record<string, unknown>) {
  const calendarId = getCalendarId(args)
  const event = readRecord(
    await googleJson(
      token,
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(requiredString(args.eventId, "eventId"))}`
    )
  )

  return await stampGoogleEvent(event, calendarId)
}

async function createCalendarEvent(
  token: string,
  args: Record<string, unknown>
) {
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(getCalendarId(args))}/events`
  )
  setOptionalSearchParam(url, "sendUpdates", args.sendUpdates)
  const event = readRecord(
    await googleJson(token, url.toString(), {
      method: "POST",
      body: requiredObject(args.event, "event"),
    })
  )

  return await stampGoogleEvent(event, getCalendarId(args))
}

async function updateCalendarEvent(
  token: string,
  args: Record<string, unknown>
) {
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(getCalendarId(args))}/events/${encodeURIComponent(requiredString(args.eventId, "eventId"))}`
  )
  setOptionalSearchParam(url, "sendUpdates", args.sendUpdates)
  const event = readRecord(
    await googleJson(token, url.toString(), {
      method: "PATCH",
      body: requiredObject(args.event, "event"),
    })
  )

  return await stampGoogleEvent(event, getCalendarId(args))
}
