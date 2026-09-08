import { afterEach, describe, expect, test, vi } from "vitest"
import { schemaViolations } from "../../../../test/convex/schema"
import { microsoftToolInputSchemas } from "../../../runs/agent/tools/schemas/microsoft"
import { microsoftToolResponseSchemas } from "../../../runs/agent/tools/schemas/responses/microsoft"
import { normalizeBrokerToolInput } from "../../input"
import { callMicrosoftCalendarTool } from "./calendar"

afterEach(() => vi.unstubAllGlobals())

const event = {
  subject: "Synthetic meeting",
  start: { dateTime: "2030-01-01T10:00:00", timeZone: "UTC" },
  end: { dateTime: "2030-01-01T11:00:00", timeZone: "UTC" },
  attendees: [{ emailAddress: { address: "fixture@example.com" } }],
}

const writes = [
  {
    tool: "microsoft_calendar_create_event",
    args: { event },
    path: "/me/events",
    method: "POST",
  },
  {
    tool: "microsoft_calendar_update_event",
    args: { eventId: "event/1", event: { subject: "Changed fixture" } },
    path: "/me/events/event%2F1",
    method: "PATCH",
  },
] as const

describe.each(writes)("$tool notification semantics", (write) => {
  test.each([
    "all",
    "none",
  ])("rejects unsupported sendUpdates=%s at the broker boundary", (sendUpdates) => {
    expect(() =>
      normalizeBrokerToolInput(write.tool, { ...write.args, sendUpdates })
    ).toThrow(`${write.tool}.sendUpdates is not supported`)
  })

  test("explains that attendee email cannot be suppressed", () => {
    const schema = microsoftToolInputSchemas[write.tool]

    expect(schema).toMatchObject({
      properties: {
        event: {
          description: expect.stringContaining(
            "this tool cannot suppress those emails"
          ),
        },
      },
    })
    expect(schema).not.toHaveProperty("properties.sendUpdates")
  })

  test("sends only the documented Graph write and returns a stamped event", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ id: "event/1", ...event, ...write.args.event })
      )
    vi.stubGlobal("fetch", fetch)
    const args = normalizeBrokerToolInput(write.tool, write.args)
    const result = await callMicrosoftCalendarTool(
      "synthetic-token",
      write.tool,
      args
    )

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(`https://graph.microsoft.com/v1.0${write.path}`)
    expect(init.method).toBe(write.method)
    expect(JSON.parse(init.body)).toEqual(write.args.event)
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer synthetic-token"
    )
    expect(result).toMatchObject({
      id: "event/1",
      entityKey: expect.stringMatching(/^[0-9a-f]{32}$/),
      contentHash: expect.stringMatching(/^[0-9a-f]{32}$/),
    })
    expect(
      schemaViolations(result, microsoftToolResponseSchemas[write.tool])
    ).toEqual([])
  })
})
