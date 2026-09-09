import { expect, test } from "vitest"
import { normalizeBrokerToolInput } from "."

test("broker input validation accepts writable Notion page icon and cover shapes", () => {
  expect(
    normalizeBrokerToolInput("notion_create_page", {
      cover: {
        type: "external",
        external: { url: "https://example.com/cover.png" },
      },
      icon: { type: "emoji", emoji: "🪿" },
      parent: { page_id: "page_1" },
      properties: { title: { title: [{ text: { content: "Draft" } }] } },
    })
  ).toMatchObject({ icon: { emoji: "🪿" } })

  expect(
    normalizeBrokerToolInput("notion_update_page", {
      cover: { type: "file_upload", file_upload: { id: "upload_1" } },
      icon: { type: "icon", icon: { color: "blue", name: "book" } },
      pageId: "page_1",
    })
  ).toMatchObject({ cover: { type: "file_upload" } })
})

test("broker input validation rejects unsupported Notion page media shapes", () => {
  expect(() =>
    normalizeBrokerToolInput("notion_create_page", {
      icon: { type: "file", file: { url: "https://example.com/icon.png" } },
      parent: { page_id: "page_1" },
      properties: { title: { title: [{ text: { content: "Draft" } }] } },
    })
  ).toThrow("notion_create_page.icon")

  expect(() =>
    normalizeBrokerToolInput("notion_create_page", {
      cover: {
        type: "external",
        external: { url: "http://example.com/cover.png" },
      },
      parent: { page_id: "page_1" },
      properties: { title: { title: [{ text: { content: "Draft" } }] } },
    })
  ).toThrow("notion_create_page.cover.external.url has invalid format")
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

test("broker input validation preserves supported Notion children and Unicode keys and text", () => {
  const input = {
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
          rich_text: [{ type: "text", text: { content: "Hallå världen ✨" } }],
        },
      },
      { object: "block", type: "divider", divider: {} },
    ],
  }

  expect(
    normalizeBrokerToolInput("notion_create_page", structuredClone(input))
  ).toEqual(input)
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
  ).toMatchObject({
    event: { summary: "Planning", location: "Conference room" },
  })

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
  ).toMatchObject({
    event: {
      subject: "Planning",
      location: { displayName: "Conference room" },
    },
  })

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

test("broker input validation preserves string Slack timestamps", () => {
  expect(
    normalizeBrokerToolInput("conversations_add_message", {
      channel: "C123",
      text: "Hello",
      thread_ts: "1782131901.806779",
    })
  ).toMatchObject({ channel: "C123", thread_ts: "1782131901.806779" })
})

test("broker input validation coerces numeric Slack timestamps", () => {
  expect(
    normalizeBrokerToolInput("slack_add_reaction", {
      channel: "C123",
      name: "sparkles",
      timestamp: 1782382133.099689,
    })
  ).toEqual({
    channel: "C123",
    name: "sparkles",
    timestamp: "1782382133.099689",
  })

  expect(
    normalizeBrokerToolInput("conversations_replies", {
      channel: "C123",
      ts: 1782380950.661619,
    })
  ).toMatchObject({ ts: "1782380950.661619" })

  expect(
    normalizeBrokerToolInput("conversations_history", {
      channel: "C123",
      latest: 1782382133.099689,
      oldest: 1782380950.661619,
    })
  ).toMatchObject({
    latest: "1782382133.099689",
    oldest: "1782380950.661619",
  })

  expect(
    normalizeBrokerToolInput("conversations_add_message", {
      channel: "C123",
      text: "Hello",
      thread_ts: 1782380950.661619,
    })
  ).toMatchObject({ thread_ts: "1782380950.661619" })
})

test("broker input validation keeps non-timestamp Slack strings strict", () => {
  expect(() =>
    normalizeBrokerToolInput("slack_add_reaction", {
      channel: 123,
      name: "sparkles",
      timestamp: 1782382133.099689,
    })
  ).toThrow("slack_add_reaction.channel must be a string")
})

function timedEvent(titleKey: "subject" | "summary") {
  return {
    [titleKey]: "Planning",
    start: { dateTime: "2026-06-22T12:00:00Z", timeZone: "UTC" },
    end: { dateTime: "2026-06-22T12:30:00Z", timeZone: "UTC" },
  }
}
