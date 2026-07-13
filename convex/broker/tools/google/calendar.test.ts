import { afterEach, describe, expect, test, vi } from "vitest"
import { type Doc, type Id } from "../../../_generated/dataModel"
import { googleIntegrationConfigs } from "../../../integrations/google/config"
import { callGoogleTool } from "."

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
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
    expect(result.items).toEqual([
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
