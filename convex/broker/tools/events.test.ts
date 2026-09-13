import { afterEach, describe, expect, test, vi } from "vitest"
import { mockJsonFetch } from "../../../test/convex/broker"
import { integration } from "../../../test/convex/tools"
import { callGoogleTool } from "./google"
import { callMicrosoftTool } from "./microsoft"

afterEach(() => vi.unstubAllGlobals())

const providers = [
  {
    name: "Google",
    listPath: "/users/me/calendarList",
    page: (items: unknown[], truncated = false) => ({
      items,
      ...(truncated ? { nextPageToken: "next" } : {}),
    }),
    call: (limit: number) =>
      callGoogleTool(
        integration("googleCalendar"),
        "google_calendar_list_events",
        { maxResults: limit }
      ),
  },
  {
    name: "Microsoft",
    listPath: "/me/calendars",
    page: (value: unknown[], truncated = false) => ({
      value,
      ...(truncated ? { "@odata.nextLink": "https://unused.test/next" } : {}),
    }),
    call: (limit: number) =>
      callMicrosoftTool(
        integration("microsoftCalendar"),
        "microsoft_calendar_list_events",
        { top: limit }
      ),
  },
]

describe.each(providers)("$name calendar scan boundaries", (provider) => {
  test.each([
    { remaining: {}, truncated: false },
    { remaining: { id: "unread" }, truncated: true },
  ])(
    "reports truncation only for remaining calendars with IDs: $truncated",
    async ({ remaining, truncated }) => {
      const calls = mockJsonFetch((url) =>
        provider.page(
          url.pathname.endsWith(provider.listPath)
            ? [{ id: "first" }, remaining]
            : [{ id: "event" }]
        )
      )

      expect(await provider.call(1)).toMatchObject({
        events: [{ id: "event", calendarId: "first" }],
        calendarsScanned: 1,
        gaps: [],
        status: truncated ? "partial" : "ready",
        truncated,
      })
      expect(calls).toHaveLength(2)
    }
  )

  test.each(["calendars", "events"])(
    "retains truncation from the provider's %s page",
    async (truncatedPage) => {
      const calls = mockJsonFetch((url) => {
        const listing = url.pathname.endsWith(provider.listPath)
        return provider.page(
          [{ id: listing ? "first" : "event" }],
          listing === (truncatedPage === "calendars")
        )
      })

      expect(await provider.call(1)).toMatchObject({
        calendarsScanned: 1,
        gaps: [],
        status: "partial",
        truncated: true,
      })
      expect(calls).toHaveLength(2)
    }
  )
})

describe.each(providers)("$name calendar scan failures", (provider) => {
  test("continues after failures and bounds gaps without counting failed scans", async () => {
    const calls = mockJsonFetch((url) => {
      if (url.pathname.endsWith(provider.listPath)) {
        return provider.page([
          {},
          { id: "unnamed" },
          ...Array.from({ length: 11 }, (_, index) => ({
            id: `failed-${index}`,
            name: `Calendar ${index}`,
            summary: `Calendar ${index}`,
          })),
          { id: "readable" },
        ])
      }
      if (!url.pathname.includes("/calendars/readable/")) {
        throw new Error("Calendar unavailable")
      }
      return provider.page([{ id: "event" }])
    })

    expect(await provider.call(10)).toMatchObject({
      events: [{ id: "event", calendarId: "readable" }],
      calendarsScanned: 1,
      gaps: [
        "Could not read one calendar.",
        ...Array.from(
          { length: 9 },
          (_, index) => `Could not read Calendar ${index}.`
        ),
      ],
      status: "partial",
      truncated: false,
    })
    expect(calls).toHaveLength(14)
  })
})
