import { listGoogleCalendars } from "../../../integrations/google/calendars"
import {
  boundedNumber,
  optionalString,
  readArray,
  readRecord,
} from "../../../shared/input"
import { type CalendarSummary } from "../events"

/** The list_calendars tool result: Google calendarList entries reduced to
 *  the normalized calendar summary both providers share. */
export async function listGoogleCalendarSummaries(
  token: string,
  args: Record<string, unknown>
) {
  const page = readRecord(
    await listGoogleCalendars(token, {
      maxResults: boundedNumber(args.maxResults, 100, 1, 100),
      pageToken: optionalString(args.pageToken),
    })
  )
  const nextPageToken = optionalString(page.nextPageToken)

  return {
    calendars: readArray(page.items).map(readRecord).map(googleCalendarSummary),
    ...(nextPageToken === undefined ? {} : { nextPageToken }),
  }
}

function googleCalendarSummary(
  entry: Record<string, unknown>
): CalendarSummary {
  const description = optionalString(entry.description)
  const timeZone = optionalString(entry.timeZone)
  const accessRole = optionalString(entry.accessRole)

  return {
    provider: "googleCalendar",
    calendarId: optionalString(entry.id) ?? "",
    name:
      optionalString(entry.summaryOverride) ??
      optionalString(entry.summary) ??
      "",
    ...(description === undefined ? {} : { description }),
    ...(timeZone === undefined ? {} : { timeZone }),
    ...(entry.primary === true ? { primary: true } : {}),
    ...(accessRole === undefined ? {} : { accessRole }),
    ...(entry.hidden === true ? { hidden: true } : {}),
  }
}
