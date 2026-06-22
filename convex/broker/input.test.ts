import { expect, test } from "vitest"
import { toolPermissions } from "../../contracts/permissions"
import { hasBrokerToolInputSchema, normalizeBrokerToolInput } from "./input"

test("broker input schemas cover every permissioned tool", () => {
  const missing = toolPermissions
    .filter((permission) => !hasBrokerToolInputSchema(permission.tool))
    .map((permission) => permission.tool)

  expect(missing).toEqual([])
})

test("broker input validation rejects unsupported Notion page icons before approval", () => {
  expect(() =>
    normalizeBrokerToolInput("notion_create_page", {
      icon: { type: "emoji", emoji: "🪿" },
      parent: { page_id: "page_1" },
      properties: { title: { title: [{ text: { content: "Draft" } }] } },
    })
  ).toThrow("notion_create_page.icon is not supported")
})

test("broker input validation rejects Notion blocks that combine multiple block types", () => {
  expect(() =>
    normalizeBrokerToolInput("notion_create_page", {
      parent: { page_id: "page_1" },
      properties: { title: { title: [{ text: { content: "Draft" } }] } },
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: "Hello" } }],
          },
          heading_2: {
            rich_text: [{ type: "text", text: { content: "Heading" } }],
          },
        },
      ],
    })
  ).toThrow("notion_create_page.children[0]")
})

test("broker input validation accepts supported Notion page children", () => {
  expect(
    normalizeBrokerToolInput("notion_create_page", {
      parent: { page_id: "page_1" },
      properties: { title: { title: [{ text: { content: "Draft" } }] } },
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: "Hello" } }],
          },
        },
        { object: "block", type: "divider", divider: {} },
      ],
    })
  ).toMatchObject({
    parent: { page_id: "page_1" },
  })
})

test("broker input validation preserves Unicode object keys and text", () => {
  expect(
    normalizeBrokerToolInput("notion_create_page", {
      parent: { page_id: "page_1" },
      properties: {
        "ÅÄÖ 😀": {
          title: [{ text: { content: "Räksmörgås 🚀" } }],
        },
      },
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              { type: "text", text: { content: "Hallå världen ✨" } },
            ],
          },
        },
      ],
    })
  ).toMatchObject({
    properties: {
      "ÅÄÖ 😀": {
        title: [{ text: { content: "Räksmörgås 🚀" } }],
      },
    },
  })
})

test("broker input validation requires calendar event timing for create tools", () => {
  expect(() =>
    normalizeBrokerToolInput("google_calendar_create_event", {
      event: { summary: "Planning" },
    })
  ).toThrow("google_calendar_create_event.event.start is required")

  expect(() =>
    normalizeBrokerToolInput("microsoft_calendar_create_event", {
      event: { subject: "Planning" },
    })
  ).toThrow("microsoft_calendar_create_event.event.start is required")
})

test("broker input validation keeps Google and Microsoft event bodies distinct", () => {
  expect(
    normalizeBrokerToolInput("google_calendar_create_event", {
      event: { ...timedEvent("summary"), location: "Conference room" },
    })
  ).toMatchObject({ event: { location: "Conference room" } })

  expect(() =>
    normalizeBrokerToolInput("google_calendar_create_event", {
      event: { ...timedEvent("summary"), location: { displayName: "Room" } },
    })
  ).toThrow("google_calendar_create_event.event.location must be a string")

  expect(
    normalizeBrokerToolInput("microsoft_calendar_create_event", {
      event: {
        ...timedEvent("subject"),
        location: { displayName: "Conference room" },
      },
    })
  ).toMatchObject({ event: { location: { displayName: "Conference room" } } })

  expect(() =>
    normalizeBrokerToolInput("microsoft_calendar_create_event", {
      event: {
        subject: "Planning",
        start: { date: "2026-06-22" },
        end: { date: "2026-06-23" },
      },
    })
  ).toThrow("microsoft_calendar_create_event.event.start.dateTime is required")
})

test("broker input validation accepts representative provider write inputs", () => {
  expect(
    normalizeBrokerToolInput("conversations_add_message", {
      channel: "C123",
      text: "Hello",
      thread_ts: "1782131901.806779",
    })
  ).toMatchObject({ channel: "C123" })
  expect(
    normalizeBrokerToolInput("google_calendar_create_event", {
      event: timedEvent("summary"),
    })
  ).toMatchObject({ event: { summary: "Planning" } })
  expect(
    normalizeBrokerToolInput("microsoft_calendar_create_event", {
      event: timedEvent("subject"),
    })
  ).toMatchObject({ event: { subject: "Planning" } })
})

function timedEvent(titleKey: "subject" | "summary") {
  return {
    [titleKey]: "Planning",
    start: { dateTime: "2026-06-22T12:00:00Z", timeZone: "UTC" },
    end: { dateTime: "2026-06-22T12:30:00Z", timeZone: "UTC" },
  }
}
