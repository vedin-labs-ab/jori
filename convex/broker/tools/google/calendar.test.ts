import { afterEach, describe, expect, test, vi } from "vitest"
import {
  calendarListSchema,
  eventListingSchema,
} from "../../../../contracts/tools/responses/calendar"
import { mockJsonFetch } from "../../../../test/convex/broker"
import { schemaViolations } from "../../../../test/convex/schema"
import { integration } from "../../../../test/convex/tools"
import { googleIntegrationConfigs } from "../../../integrations/google/config"
import { callGoogleTool } from "."

afterEach(() => vi.unstubAllGlobals())

describe("Google Calendar listings", () => {
  test("normalizes calendar entries and conforms to the schema", async () => {
    mockJsonFetch(() => ({
      items: [
        {
          id: "primary",
          summary: "Primary",
          summaryOverride: "Work",
          timeZone: "Europe/Stockholm",
          accessRole: "owner",
          primary: true,
          conferenceProperties: {
            allowedConferenceSolutionTypes: ["hangoutsMeet"],
          },
        },
        { id: "team", summary: "Team", accessRole: "reader", hidden: true },
      ],
      nextPageToken: "token",
    }))

    const result = await callGoogleTool(
      integration("googleCalendar"),
      "google_calendar_list_calendars",
      {}
    )

    expect(result).toEqual({
      calendars: [
        {
          provider: "googleCalendar",
          calendarId: "primary",
          name: "Work",
          timeZone: "Europe/Stockholm",
          primary: true,
          accessRole: "owner",
        },
        {
          provider: "googleCalendar",
          calendarId: "team",
          name: "Team",
          accessRole: "reader",
          hidden: true,
        },
      ],
      nextPageToken: "token",
    })
    expect(schemaViolations(result, calendarListSchema(true))).toEqual([])
  })
})

describe("Google Calendar discovery", () => {
  test("scans every readable calendar and follows event pages", async () => {
    const calls = mockJsonFetch((url) => {
      if (url.pathname.endsWith("/users/me/calendarList")) {
        return {
          items: [
            { id: "primary", summary: "Primary" },
            { id: "team", summary: "Team" },
          ],
        }
      }
      if (url.pathname.includes("/calendars/primary/events")) {
        return url.searchParams.get("pageToken") === "next"
          ? { items: [event("early", "08:00")] }
          : { items: [event("late", "10:00")], nextPageToken: "next" }
      }
      return { items: [event("middle", "09:00")] }
    })

    const result = (await callGoogleTool(
      integration("googleCalendar"),
      "google_calendar_list_events",
      {
        maxResults: 250,
        singleEvents: true,
        timeMax: "2030-01-02T08:00:00Z",
        timeMin: "2030-01-01T08:00:00Z",
      }
    )) as Record<string, unknown>

    expect(result).toMatchObject({
      calendarsScanned: 2,
      gaps: [],
      status: "ready",
      truncated: false,
    })
    expect(schemaViolations(result, eventListingSchema())).toEqual([])
    expect(result.events).toEqual([
      expect.objectContaining({ id: "early", calendarId: "primary" }),
      expect.objectContaining({ id: "middle", calendarId: "team" }),
      expect.objectContaining({ id: "late", calendarId: "primary" }),
    ])
    expect(calls[0]?.url).toContain("showHidden=true")
    expect(calls[0]?.url).toContain("minAccessRole=reader")
    expect(calls.some((call) => call.url.includes("pageToken=next"))).toBe(true)
  })

  test("requests calendar-list access for calendar integrations", () => {
    expect(googleIntegrationConfigs.googleCalendar.scopes).toContain(
      "https://www.googleapis.com/auth/calendar.calendarlist.readonly"
    )
  })
})

describe("calendar event identity", () => {
  test("stamps a stable entityKey and a content-sensitive contentHash", async () => {
    const first = await listedEvent({
      ...event("evt", "09:00"),
      summary: "Sync",
      attendees: [{ email: "A@x.com" }, { email: "a@x.com " }],
    })
    const same = await listedEvent({
      ...event("evt", "09:00"),
      summary: "Sync",
      attendees: [{ email: "a@x.com" }],
    })
    const renamed = await listedEvent({
      ...event("evt", "09:00"),
      summary: "Renamed",
      attendees: [{ email: "a@x.com" }],
    })

    expect(first.entityKey).toMatch(/^[0-9a-f]{32}$/)
    expect(first.contentHash).toMatch(/^[0-9a-f]{32}$/)
    expect(same.entityKey).toBe(first.entityKey)
    expect(same.contentHash).toBe(first.contentHash)
    expect(renamed.entityKey).toBe(first.entityKey)
    expect(renamed.contentHash).not.toBe(first.contentHash)
  })

  test("get_event stamps the same identity as the listing", async () => {
    const listed = await listedEvent({
      ...event("evt", "09:00"),
      summary: "Sync",
    })

    mockJsonFetch(() => ({ ...event("evt", "09:00"), summary: "Sync" }))
    const fetched = (await callGoogleTool(
      integration("googleCalendar"),
      "google_calendar_get_event",
      { calendarId: "team", eventId: "evt" }
    )) as Record<string, unknown>

    expect(fetched.entityKey).toBe(listed.entityKey)
    expect(fetched.contentHash).toBe(listed.contentHash)
  })
})

async function listedEvent(raw: Record<string, unknown>) {
  mockJsonFetch(() => ({ items: [raw] }))

  const result = (await callGoogleTool(
    integration("googleCalendar"),
    "google_calendar_list_events",
    { calendarId: "team", maxResults: 10 }
  )) as { events: Record<string, unknown>[] }

  return result.events[0]
}

function event(id: string, time: string) {
  return { id, start: { dateTime: `2030-01-01T${time}:00Z` } }
}
