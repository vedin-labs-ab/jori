import { describe, expect, test } from "vitest"
import { microsoftToolInputSchemas } from "../../../runs/agent/tools/schemas/microsoft"
import { normalizeBrokerToolInput } from "../../input"

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
  },
  {
    tool: "microsoft_calendar_update_event",
    args: { eventId: "event/1", event: { subject: "Changed fixture" } },
  },
] as const

describe.each(writes)("$tool notification semantics", (write) => {
  test.each(["all", "none"])(
    "rejects unsupported sendUpdates=%s at the broker boundary",
    (sendUpdates) => {
      expect(() =>
        normalizeBrokerToolInput(write.tool, { ...write.args, sendUpdates })
      ).toThrow(`${write.tool}.sendUpdates is not supported`)
    }
  )

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
})
