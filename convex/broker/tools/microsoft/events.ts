import { optionalString, readArray, readRecord } from "../../../shared/input"
import { type CalendarEventContent, stampCalendarEvent } from "../events"

function microsoftEventTime(value: unknown) {
  const time = readRecord(value)

  return [
    optionalString(time.dateTime) ?? "",
    optionalString(time.timeZone) ?? "",
  ]
    .join(" ")
    .trim()
}

export async function stampMicrosoftEvent(
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
