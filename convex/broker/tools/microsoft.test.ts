import { afterEach, describe, expect, test, vi } from "vitest"
import { createAssetContext } from "../../../test/convex/broker"
import { schemaViolations } from "../../../test/convex/schema"
import { type Doc, type Id } from "../../_generated/dataModel"
import {
  calendarListSchema,
  eventListingSchema,
} from "../../runs/agent/tools/schemas/responses/calendar"
import { callMicrosoftTool } from "./microsoft"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe("Microsoft Calendar discovery", () => {
  test("scans every calendar and follows Graph next links", async () => {
    const calls = mockMicrosoftFetchByUrl((url) => {
      if (url.pathname.endsWith("/me/calendars")) {
        return {
          value: [
            { id: "primary", name: "Primary" },
            { id: "team", name: "Team" },
          ],
        }
      }
      if (url.pathname.includes("/calendars/primary/calendarView")) {
        return url.searchParams.has("$skiptoken")
          ? {
              value: [
                { id: "early", start: { dateTime: "2030-01-01T08:00:00Z" } },
              ],
            }
          : {
              value: [
                { id: "late", start: { dateTime: "2030-01-01T10:00:00Z" } },
              ],
              "@odata.nextLink":
                "https://graph.microsoft.com/v1.0/me/calendars/primary/calendarView?$skiptoken=next",
            }
      }

      return {
        value: [{ id: "middle", start: { dateTime: "2030-01-01T09:00:00Z" } }],
      }
    })

    const result = (await callMicrosoftTool(
      microsoftCalendarIntegration(),
      "microsoft_calendar_list_events",
      {
        timeMax: "2030-01-02T08:00:00Z",
        timeMin: "2030-01-01T08:00:00Z",
        top: 250,
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
    expect(calls.some((call) => call.url.includes("skiptoken=next"))).toBe(true)

    for (const stamped of result.events as Record<string, unknown>[]) {
      expect(stamped.entityKey).toMatch(/^[0-9a-f]{32}$/)
      expect(stamped.contentHash).toMatch(/^[0-9a-f]{32}$/)
    }
  })
})

describe("Microsoft Calendar listings", () => {
  test("normalizes Graph calendars and conforms to the schema", async () => {
    mockMicrosoftFetch({
      value: [
        {
          id: "cal-1",
          name: "Calendar",
          isDefaultCalendar: true,
          canEdit: true,
          owner: { name: "Albin Vedin", address: "albin@example.com" },
          allowedOnlineMeetingProviders: ["teamsForBusiness"],
        },
        { id: "cal-2", name: "Team", canEdit: false },
      ],
    })

    const result = await callMicrosoftTool(
      microsoftCalendarIntegration(),
      "microsoft_calendar_list_calendars",
      {}
    )

    expect(result).toEqual({
      calendars: [
        {
          provider: "microsoftCalendar",
          calendarId: "cal-1",
          name: "Calendar",
          primary: true,
          canEdit: true,
          owner: "albin@example.com",
        },
        {
          provider: "microsoftCalendar",
          calendarId: "cal-2",
          name: "Team",
          canEdit: false,
        },
      ],
    })
    expect(schemaViolations(result, calendarListSchema(false))).toEqual([])
  })
})

describe("Outlook email tools", () => {
  test("sends run assets as Graph file attachments", async () => {
    const calls = mockMicrosoftFetch(null)

    const result = await callMicrosoftTool(
      microsoftEmailIntegration(),
      "microsoft_email_send_message",
      {
        assets: [{ assetId: "asset-id" }],
        body: "See attached.",
        subject: "File",
        to: ["recipient@example.com"],
      },
      createAssetContext()
    )

    expect(result).toEqual({ status: "sent" })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe("https://graph.microsoft.com/v1.0/me/sendMail")
    expect(calls[0]?.body).toMatchObject({
      message: {
        subject: "File",
        attachments: [
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: "kitten.png",
            contentType: "image/png",
            contentBytes: "aGVsbG8=",
          },
        ],
      },
      saveToSentItems: true,
    })
  })
})

function mockMicrosoftFetch(responseBody: unknown) {
  const calls: Array<{ body: unknown; url: string }> = []

  globalThis.fetch = vi.fn(async (url, init) => {
    calls.push({
      body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
      url: String(url),
    })

    return Response.json(responseBody)
  })

  return calls
}

function mockMicrosoftFetchByUrl(responseBody: (url: URL) => unknown) {
  const calls: Array<{ body: unknown; url: string }> = []

  globalThis.fetch = vi.fn(async (url, init) => {
    const requestUrl = new URL(String(url))
    calls.push({
      body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
      url: requestUrl.toString(),
    })
    return Response.json(responseBody(requestUrl))
  })

  return calls
}

function microsoftEmailIntegration(): Doc<"integrations"> {
  return {
    _id: "microsoft-email-integration",
    _creationTime: 0,
    organizationId: "organization",
    integration: "microsoftEmail",
    scope: "user",
    ownerId: "person" as Id<"persons">,
    externalId: "microsoft-account",
    email: "sender@example.com",
    credentials: {
      tokens: { access: "access-token", refresh: "refresh-token" },
      expiresAt: Date.now() + 60_000,
      tenantId: "microsoft-tenant",
    },
    status: "active",
    createdBy: "person" as Id<"persons">,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}

function microsoftCalendarIntegration(): Doc<"integrations"> {
  return {
    ...microsoftEmailIntegration(),
    _id: "microsoft-calendar-integration",
    integration: "microsoftCalendar",
  } as Doc<"integrations">
}
