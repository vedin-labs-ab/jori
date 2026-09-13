import { sha256Hex } from "../../shared/crypto"

// Calendar events carry a server-computed identity so every reader — planner
// runs and delivery jobs — sees the same key and change
// detector for the same provider data, with no client-side hashing.

/** Content that identifies change. Providers extract these from their native
 *  payloads; canonicalization and hashing happen here. */
export type CalendarEventContent = {
  title: string
  start: string
  end: string
  status: string
  description: string
  organizer: string
  attendees: string[]
}

type CalendarEventRef = {
  provider: "googleCalendar" | "microsoftCalendar"
  calendarId: string | undefined
  eventId: string
}

const hashLength = 32

/** Stamp a provider event with its integration `provider` key, `entityKey`
 *  (stable across content edits), and `contentHash` (changes when the
 *  event's content changes). */
export async function stampCalendarEvent(
  event: Record<string, unknown>,
  ref: CalendarEventRef,
  content: CalendarEventContent
) {
  return {
    ...event,
    provider: ref.provider,
    entityKey: await calendarEntityKey(ref),
    contentHash: await calendarContentHash(content),
  }
}

async function calendarEntityKey(ref: CalendarEventRef) {
  const hash = await sha256Hex(
    [ref.provider, ref.calendarId ?? "default", ref.eventId].join("\n")
  )

  return hash.slice(0, hashLength)
}

async function calendarContentHash(content: CalendarEventContent) {
  const attendees = [
    ...new Set(
      content.attendees
        .map((attendee) => attendee.trim().toLowerCase())
        .filter((attendee) => attendee !== "")
    ),
  ].sort()
  const hash = await sha256Hex(
    JSON.stringify([
      content.title.trim(),
      content.start.trim(),
      content.end.trim(),
      content.status.trim().toLowerCase(),
      content.description.trim(),
      content.organizer.trim().toLowerCase(),
      attendees,
    ])
  )

  return hash.slice(0, hashLength)
}

/** One calendar in the normalized listing both providers return from their
 *  list_calendars tools. Provider-specific fields stay optional and named. */
export type CalendarSummary = {
  provider: CalendarEventRef["provider"]
  calendarId: string
  name: string
  description?: string
  timeZone?: string
  primary?: boolean
  accessRole?: string
  canEdit?: boolean
  owner?: string
  hidden?: boolean
}

/** Combine readable calendars under one result limit, retaining gaps when a
 * provider cannot read a calendar. Providers own pagination and event shapes. */
export async function scanCalendarEvents(args: {
  calendars: { calendarId?: string; calendarName?: string }[]
  limit: number
  truncated: boolean
  scan: (calendar: {
    calendarId: string
    calendarName?: string
    limit: number
  }) => Promise<{ events: Record<string, unknown>[]; truncated: boolean }>
  eventTime: (event: Record<string, unknown>) => string
}) {
  const events: Record<string, unknown>[] = []
  const gaps: string[] = []
  let truncated = args.truncated
  let calendarsScanned = 0

  for (const { calendarId, calendarName } of args.calendars) {
    if (calendarId === undefined) {
      continue
    }
    if (events.length >= args.limit) {
      truncated = true
      break
    }

    try {
      const result = await args.scan({
        calendarId,
        calendarName,
        limit: args.limit - events.length,
      })
      events.push(...result.events)
      truncated ||= result.truncated
      calendarsScanned += 1
    } catch {
      gaps.push(`Could not read ${calendarName ?? "one calendar"}.`)
    }
  }

  return {
    events: events.sort((left, right) =>
      args.eventTime(left).localeCompare(args.eventTime(right))
    ),
    calendarsScanned,
    gaps: gaps.slice(0, 10),
    status: gaps.length > 0 || truncated ? "partial" : "ready",
    truncated,
  }
}
