import { compactRecord } from "../../../../contracts/json"
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
  return compactRecord({
    calendars: readArray(page.items).map(readRecord).map(googleCalendarSummary),
    nextPageToken: optionalString(page.nextPageToken),
  })
}

function googleCalendarSummary(
  entry: Record<string, unknown>
): CalendarSummary {
  return compactRecord({
    provider: "googleCalendar" as const,
    calendarId: optionalString(entry.id) ?? "",
    name:
      optionalString(entry.summaryOverride) ??
      optionalString(entry.summary) ??
      "",
    description: optionalString(entry.description),
    timeZone: optionalString(entry.timeZone),
    primary: entry.primary === true ? true : undefined,
    accessRole: optionalString(entry.accessRole),
    hidden: entry.hidden === true ? true : undefined,
  })
}
