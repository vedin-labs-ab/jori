import { compactRecord } from "../../../../contracts/json"
import { listMicrosoftCalendars } from "../../../integrations/microsoft/calendars"
import {
  boundedNumber,
  optionalString,
  readArray,
  readRecord,
} from "../../../shared/input"
import { type CalendarSummary } from "../events"

/** The list_calendars tool result: Graph calendars reduced to the
 *  normalized calendar summary both providers share. */
export async function listMicrosoftCalendarSummaries(
  token: string,
  args: Record<string, unknown>
) {
  const page = readRecord(
    await listMicrosoftCalendars(token, boundedNumber(args.top, 100, 1, 100))
  )

  return {
    calendars: readArray(page.value)
      .map(readRecord)
      .map(microsoftCalendarSummary),
  }
}

function microsoftCalendarSummary(
  calendar: Record<string, unknown>
): CalendarSummary {
  return compactRecord({
    provider: "microsoftCalendar" as const,
    calendarId: optionalString(calendar.id) ?? "",
    name: optionalString(calendar.name) ?? "",
    primary: calendar.isDefaultCalendar === true ? true : undefined,
    canEdit:
      typeof calendar.canEdit === "boolean" ? calendar.canEdit : undefined,
    owner: optionalString(
      readRecord(calendar.owner).address ?? readRecord(calendar.owner).name
    ),
  })
}
