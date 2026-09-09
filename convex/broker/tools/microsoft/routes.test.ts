import { afterEach, describe, expect, test, vi } from "vitest"
import { integrationDoc } from "../../../../test/convex/integrations"
import { schemaViolations } from "../../../../test/convex/schema"
import { microsoftToolResponseSchemas } from "../../../runs/agent/tools/schemas/responses/microsoft"
import { normalizeBrokerToolInput } from "../../input"
import { callMicrosoftTool } from "."

afterEach(() => vi.unstubAllGlobals())

const message = {
  id: "message/1",
  conversationId: "thread/1",
  subject: "Synthetic mail",
  toRecipients: [{ emailAddress: { address: "fixture@example.com" } }],
  ccRecipients: [],
  body: { contentType: "text", content: "Synthetic body" },
}
const meeting = {
  subject: "Synthetic event",
  attendees: [{ emailAddress: { address: "fixture@example.com" } }],
  start: { dateTime: "2030-01-01T10:00:00", timeZone: "UTC" },
  end: { dateTime: "2030-01-01T11:00:00", timeZone: "UTC" },
}
const event = { id: "event/1", ...meeting }
const outgoing = {
  to: ["fixture@example.com"],
  subject: "Synthetic mail",
  body: "Synthetic body",
}
const cases = [
  {
    tool: "microsoft_email_search_messages",
    args: { folderId: "folder/1", q: "fixture", top: 5 },
    invalid: { top: 26 },
    path: "/me/mailFolders/folder%2F1/messages",
    response: { value: [message] },
  },
  {
    tool: "microsoft_email_get_message",
    args: { messageId: "message/1" },
    invalid: { messageId: 42 },
    path: "/me/messages/message%2F1",
    response: message,
  },
  {
    tool: "microsoft_email_send_message",
    args: { ...outgoing, saveToSentItems: false },
    invalid: { ...outgoing, saveToSentItems: "false" },
    path: "/me/sendMail",
    method: "POST",
    response: null,
  },
  {
    tool: "microsoft_email_create_draft",
    args: outgoing,
    invalid: { ...outgoing, to: "fixture@example.com" },
    path: "/me/messages",
    method: "POST",
    response: message,
  },
  {
    tool: "microsoft_email_update_message",
    args: { messageId: "message/1", message: { subject: "Synthetic mail" } },
    invalid: { messageId: "message/1", message: { subject: 42 } },
    path: "/me/messages/message%2F1",
    method: "PATCH",
    response: message,
  },
  {
    tool: "microsoft_calendar_list_calendars",
    args: { top: 5 },
    invalid: { top: 101 },
    path: "/me/calendars",
    response: { value: [{ id: "calendar/1", name: "Fixture" }] },
  },
  {
    tool: "microsoft_calendar_list_events",
    args: { calendarId: "calendar/1", top: 5 },
    invalid: { top: 251 },
    path: "/me/calendars/calendar%2F1/events",
    response: { value: [event] },
  },
  {
    tool: "microsoft_calendar_get_event",
    args: { calendarId: "calendar/1", eventId: "event/1" },
    invalid: { eventId: 42 },
    path: "/me/calendars/calendar%2F1/events/event%2F1",
    response: event,
  },
  {
    tool: "microsoft_calendar_create_event",
    args: { event: meeting },
    invalid: { event: { subject: "Missing timing" } },
    path: "/me/events",
    method: "POST",
    response: event,
  },
  {
    tool: "microsoft_calendar_update_event",
    args: { eventId: "event/1", event: { subject: "Synthetic event" } },
    invalid: {
      eventId: "event/1",
      event: { start: { dateTime: "2030-01-01" } },
    },
    path: "/me/events/event%2F1",
    method: "PATCH",
    response: event,
  },
] satisfies Array<{
  tool: keyof typeof microsoftToolResponseSchemas
  args: Record<string, unknown>
  invalid: Record<string, unknown>
  path: string
  method?: string
  response: unknown
}>

test("the mocked request suite covers all ten Microsoft tools", () => {
  expect(cases.map(({ tool }) => tool).sort()).toEqual(
    Object.keys(microsoftToolResponseSchemas).sort()
  )
})

describe.each(cases)("$tool mocked Graph contract", (fixture) => {
  test("validates arguments, routes the request and conforms to its output schema", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        fixture.response === null
          ? new Response(null, { status: 202 })
          : Response.json(fixture.response)
      )
    vi.stubGlobal("fetch", fetch)
    const args = normalizeBrokerToolInput(fixture.tool, fixture.args)
    const result = await callMicrosoftTool(
      integration(fixture.tool),
      fixture.tool,
      args
    )
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0]
    expect(new URL(url).origin).toBe("https://graph.microsoft.com")
    expect(new URL(url).pathname).toBe(`/v1.0${fixture.path}`)
    expect(init.method).toBe(fixture.method ?? "GET")
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer fixture-token"
    )
    expect(
      schemaViolations(result, microsoftToolResponseSchemas[fixture.tool])
    ).toEqual([])
    if (
      fixture.tool === "microsoft_calendar_create_event" ||
      fixture.tool === "microsoft_calendar_update_event"
    ) {
      expect(JSON.parse(init.body)).toEqual(fixture.args.event)
      expect(result).toMatchObject({
        id: "event/1",
        entityKey: expect.stringMatching(/^[0-9a-f]{32}$/),
        contentHash: expect.stringMatching(/^[0-9a-f]{32}$/),
      })
    }
    if (fixture.tool === "microsoft_email_send_message") {
      expect(JSON.parse(init.body)).toMatchObject({ saveToSentItems: false })
      expect(result).toEqual({ status: "sent" })
    }
  })

  test("rejects invalid fields or bounds at the broker boundary", () => {
    expect(() =>
      normalizeBrokerToolInput(fixture.tool, fixture.invalid)
    ).toThrow()
  })
})

test.each(
  cases
)("$tool surfaces provider errors without retrying", async (fixture) => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      Response.json({ error: { code: "SyntheticFailure" } }, { status: 500 })
    )
  vi.stubGlobal("fetch", fetch)
  await expect(
    callMicrosoftTool(integration(fixture.tool), fixture.tool, fixture.args)
  ).rejects.toThrow("SyntheticFailure")
  expect(fetch).toHaveBeenCalledTimes(1)
})

function integration(tool: string) {
  return integrationDoc({
    integration: tool.startsWith("microsoft_email_")
      ? "microsoftEmail"
      : "microsoftCalendar",
    credentials: {
      tokens: { access: "fixture-token", refresh: "fixture-refresh" },
      expiresAt: Date.now() + 600_000,
      tenantId: "fixture-tenant",
    },
  })
}
