import { afterEach, describe, expect, test, vi } from "vitest"
import { type Doc, type Id } from "../../../_generated/dataModel"
import { googleIntegrationConfigs } from "../../../integrations/google/config"
import {
  calendarListSchema,
  eventListingSchema,
} from "../../../runs/agent/tools/schemas/responses/calendar"
import { schemaViolations } from "../../../runs/agent/tools/schemas/responses/conform"
import { callGoogleTool } from "."

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe("Google Calendar listings", () => {
  test("normalizes calendar entries and conforms to the schema", async () => {
    mockGoogleFetch(() => ({
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
      googleCalendarIntegration(),
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
    const calls = mockGoogleFetch((url) => {
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
      googleCalendarIntegration(),
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
    expect(calls[0]).toContain("showHidden=true")
    expect(calls[0]).toContain("minAccessRole=reader")
    expect(calls.some((url) => url.includes("pageToken=next"))).toBe(true)
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

    mockGoogleFetch(() => ({ ...event("evt", "09:00"), summary: "Sync" }))
    const fetched = (await callGoogleTool(
      googleCalendarIntegration(),
      "google_calendar_get_event",
      { calendarId: "team", eventId: "evt" }
    )) as Record<string, unknown>

    expect(fetched.entityKey).toBe(listed.entityKey)
    expect(fetched.contentHash).toBe(listed.contentHash)
  })
})

async function listedEvent(raw: Record<string, unknown>) {
  mockGoogleFetch(() => ({ items: [raw] }))

  const result = (await callGoogleTool(
    googleCalendarIntegration(),
    "google_calendar_list_events",
    { calendarId: "team", maxResults: 10 }
  )) as { events: Record<string, unknown>[] }

  return result.events[0]
}

function event(id: string, time: string) {
  return { id, start: { dateTime: `2030-01-01T${time}:00Z` } }
}

function mockGoogleFetch(responseBody: (url: URL) => unknown) {
  const calls: string[] = []

  globalThis.fetch = vi.fn(async (url) => {
    const requestUrl = new URL(String(url))
    calls.push(requestUrl.toString())
    return Response.json(responseBody(requestUrl))
  })

  return calls
}

function googleCalendarIntegration(): Doc<"integrations"> {
  return {
    _id: "google-calendar-integration",
    _creationTime: 0,
    tenantId: "tenant",
    integration: "googleCalendar",
    scope: "user",
    ownerId: "person" as Id<"persons">,
    externalId: "google-account",
    email: "sender@example.com",
    credentials: {
      tokens: { access: "access-token", refresh: "refresh-token" },
      expiresAt: Date.now() + 60_000,
    },
    status: "active",
    createdBy: "person" as Id<"persons">,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}
