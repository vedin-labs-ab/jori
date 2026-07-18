import { listMicrosoftCalendars } from "../../../integrations/microsoft/calendars"
import {
  microsoftGraphJson,
  microsoftGraphJsonNext,
} from "../../../integrations/microsoft/graph"
import {
  boundedNumber,
  optionalString,
  readArray,
  readRecord,
  requiredObject,
  requiredString,
} from "../../../shared/input"
import { type CalendarEventContent, stampCalendarEvent } from "../events"

export async function callMicrosoftCalendarTool(
  token: string,
  tool: string,
  args: Record<string, unknown>
) {
  if (tool === "microsoft_calendar_list_calendars") {
    return await listMicrosoftCalendars(
      token,
      boundedNumber(args.top, 100, 1, 100)
    )
  }
  if (tool === "microsoft_calendar_list_events") {
    return await listEvents(token, args)
  }
  if (tool === "microsoft_calendar_get_event") {
    return await getEvent(token, args)
  }
  if (tool === "microsoft_calendar_create_event") {
    return await microsoftGraphJson(token, "/me/events", {
      method: "POST",
      query: microsoftSendUpdatesQuery(args),
      body: requiredObject(args.event, "event"),
    })
  }
  if (tool === "microsoft_calendar_update_event") {
    return await microsoftGraphJson(
      token,
      `/me/events/${encodeURIComponent(requiredString(args.eventId, "eventId"))}`,
      {
        method: "PATCH",
        query: microsoftSendUpdatesQuery(args),
        body: requiredObject(args.event, "event"),
      }
    )
  }

  throw new Error(`Unknown Microsoft Calendar tool: ${tool}`)
}

async function listEvents(token: string, args: Record<string, unknown>) {
  const calendarId = optionalString(args.calendarId)

  if (calendarId === undefined) {
    return await listAllCalendarEvents(token, args)
  }

  const page = readRecord(await listCalendarEventPage(token, args, calendarId))

  return {
    ...page,
    value: await Promise.all(
      readArray(page.value).map((event) =>
        stampMicrosoftEvent(readRecord(event), calendarId)
      )
    ),
  }
}

async function getEvent(token: string, args: Record<string, unknown>) {
  const event = readRecord(
    await microsoftGraphJson(
      token,
      calendarEventPath(args, requiredString(args.eventId, "eventId"))
    )
  )

  return await stampMicrosoftEvent(event, optionalString(args.calendarId))
}

async function listAllCalendarEvents(
  token: string,
  args: Record<string, unknown>
) {
  const limit = boundedNumber(args.top, 250, 1, 250)
  const calendarPage = readRecord(await listMicrosoftCalendars(token, 100))
  const calendars = readArray(calendarPage.value).map(readRecord)
  const events: Record<string, unknown>[] = []
  const gaps: string[] = []
  let truncated = optionalString(calendarPage["@odata.nextLink"]) !== undefined
  let calendarsScanned = 0

  for (const calendar of calendars) {
    const calendarId = optionalString(calendar.id)
    if (calendarId === undefined) {
      continue
    }
    if (events.length >= limit) {
      truncated = true
      break
    }

    const calendarName = optionalString(calendar.name)
    try {
      const result = await scanMicrosoftCalendar(token, args, {
        calendarId,
        calendarName,
        limit: limit - events.length,
      })
      events.push(...result.events)
      truncated ||= result.truncated
      calendarsScanned += 1
    } catch {
      gaps.push(`Could not read ${calendarName ?? "one calendar"}.`)
    }
  }

  return {
    value: sortMicrosoftEvents(events),
    calendarsScanned,
    gaps: gaps.slice(0, 10),
    status: gaps.length > 0 || truncated ? "partial" : "ready",
    truncated,
  }
}

async function scanMicrosoftCalendar(
  token: string,
  args: Record<string, unknown>,
  calendar: { calendarId: string; calendarName?: string; limit: number }
) {
  const events: Record<string, unknown>[] = []
  let page = readRecord(
    await listCalendarEventPage(
      token,
      { ...args, top: calendar.limit },
      calendar.calendarId
    )
  )

  while (true) {
    const pageEvents = await Promise.all(
      readArray(page.value)
        .map(readRecord)
        .slice(0, calendar.limit - events.length)
        .map((event) =>
          stampMicrosoftEvent(
            {
              ...event,
              calendarId: calendar.calendarId,
              calendarName: calendar.calendarName,
            },
            calendar.calendarId
          )
        )
    )
    events.push(...pageEvents)

    const nextLink = optionalString(page["@odata.nextLink"])
    if (nextLink === undefined || events.length >= calendar.limit) {
      return { events, truncated: nextLink !== undefined }
    }
    page = readRecord(await microsoftGraphJsonNext(token, nextLink))
  }
}

async function listCalendarEventPage(
  token: string,
  args: Record<string, unknown>,
  calendarId: string
) {
  const timeMin = optionalString(args.timeMin)
  const timeMax = optionalString(args.timeMax)
  const query: Record<string, unknown> = {
    $top: boundedNumber(args.top, 100, 1, 250),
    $orderby: "start/dateTime",
  }

  if (timeMin === undefined && timeMax === undefined) {
    return await microsoftGraphJson(
      token,
      `/me/calendars/${encodeURIComponent(calendarId)}/events`,
      { query }
    )
  }

  return await microsoftGraphJson(
    token,
    `/me/calendars/${encodeURIComponent(calendarId)}/calendarView`,
    {
      query: {
        ...query,
        startDateTime: timeMin ?? new Date().toISOString(),
        endDateTime:
          timeMax ??
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    }
  )
}

function sortMicrosoftEvents(events: Record<string, unknown>[]) {
  return events.sort((left, right) =>
    microsoftEventStart(left).localeCompare(microsoftEventStart(right))
  )
}

function microsoftEventStart(event: Record<string, unknown>) {
  return optionalString(readRecord(event.start).dateTime) ?? ""
}

function microsoftEventTime(value: unknown) {
  const time = readRecord(value)

  return [
    optionalString(time.dateTime) ?? "",
    optionalString(time.timeZone) ?? "",
  ]
    .join(" ")
    .trim()
}

async function stampMicrosoftEvent(
  event: Record<string, unknown>,
  calendarId: string | undefined
) {
  return await stampCalendarEvent(
    event,
    {
      provider: "microsoftCalendar",
      calendarId,
      eventId: optionalString(event.id) ?? "",
    },
    microsoftEventContent(event)
  )
}

function microsoftEventContent(
  event: Record<string, unknown>
): CalendarEventContent {
  return {
    title: optionalString(event.subject) ?? "",
    start: microsoftEventTime(event.start),
    end: microsoftEventTime(event.end),
    status: event.isCancelled === true ? "cancelled" : "confirmed",
    description: optionalString(event.bodyPreview) ?? "",
    organizer:
      optionalString(
        readRecord(readRecord(event.organizer).emailAddress).address
      ) ?? "",
    attendees: readArray(event.attendees).map(
      (attendee) =>
        optionalString(readRecord(readRecord(attendee).emailAddress).address) ??
        ""
    ),
  }
}

function calendarEventPath(args: Record<string, unknown>, eventId: string) {
  const calendarId = optionalString(args.calendarId)
  const encodedEventId = encodeURIComponent(eventId)

  return calendarId === undefined
    ? `/me/events/${encodedEventId}`
    : `/me/calendars/${encodeURIComponent(calendarId)}/events/${encodedEventId}`
}

function microsoftSendUpdatesQuery(args: Record<string, unknown>) {
  return args.sendUpdates === "all" || args.sendUpdates === "none"
    ? { sendUpdates: args.sendUpdates }
    : {}
}
