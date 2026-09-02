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

export type CalendarEventRef = {
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
