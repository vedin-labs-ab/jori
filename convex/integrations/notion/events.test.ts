import { expect, test } from "vitest"
import { notionEventAllowsBot, readNotionJobEvents } from "./events"

test("projects Notion page content updates to page events", () => {
  const events = readNotionJobEvents(
    notionPayload({
      type: "page.content_updated",
      entity: { id: "page-id", type: "page" },
      data: {
        parent: { id: "parent-page-id", type: "page" },
        updated_blocks: [{ id: "block-id", type: "block" }],
      },
    })
  )

  expect(events).toEqual([
    expect.objectContaining({
      workspaceId: "workspace-id",
      key: "notion:workspace-id:notion-event-id:page.updated",
      type: "page.updated",
      pageId: "page-id",
      match: { page: "page-id" },
      actor: { kind: "person", externalId: "author-id" },
      observedAt: Date.parse("2026-06-12T08:00:00.000Z"),
      data: expect.objectContaining({
        pageId: "page-id",
        notionEventId: "notion-event-id",
        notionEventType: "page.content_updated",
        parent: { id: "parent-page-id", type: "page" },
      }),
    }),
  ])
})

test("projects Notion data source child page updates to page events", () => {
  const events = readNotionJobEvents(
    notionPayload({
      type: "page.properties_updated",
      entity: { id: "page-id", type: "page" },
      data: {
        parent: { id: "data-source-id", type: "data_source" },
        updated_properties: [{ id: "property-id", action: "updated" }],
      },
    })
  )

  expect(events).toEqual([
    expect.objectContaining({
      type: "page.updated",
      pageId: "page-id",
      match: { page: "page-id" },
      data: expect.objectContaining({
        pageId: "page-id",
        parent: { id: "data-source-id", type: "data_source" },
      }),
    }),
  ])
})

test("projects Notion created comments to page comment events", () => {
  const events = readNotionJobEvents(
    notionPayload({
      type: "comment.created",
      entity: { id: "comment-id", type: "comment" },
      data: {
        page_id: "page-id",
        parent: { id: "block-id", type: "block" },
      },
    })
  )

  expect(events).toEqual([
    expect.objectContaining({
      type: "comment.created",
      pageId: "page-id",
      match: { page: "page-id" },
      data: expect.objectContaining({
        commentId: "comment-id",
        pageId: "page-id",
        parent: { id: "block-id", type: "block" },
      }),
    }),
  ])
})

test("ignores unsupported Notion payloads", () => {
  expect(
    readNotionJobEvents({
      verification_token: "secret_token",
    })
  ).toEqual([])
  expect(
    readNotionJobEvents(
      notionPayload({
        type: "comment.updated",
        entity: { id: "comment-id", type: "comment" },
      })
    )
  ).toEqual([])
  expect(
    readNotionJobEvents(
      notionPayload({
        type: "data_source.content_updated",
        entity: { id: "data-source-id", type: "data_source" },
      })
    )
  ).toEqual([])
  expect(
    readNotionJobEvents(
      notionPayload({
        type: "page.created",
        entity: { id: "page-id", type: "page" },
        data: {
          parent: { id: "data-source-id", type: "data_source" },
        },
      })
    )
  ).toEqual([])
})

function notionPayload(overrides: {
  type: string
  entity: { id: string; type: string }
  data?: Record<string, unknown>
}) {
  return {
    id: "notion-event-id",
    timestamp: "2026-06-12T08:00:00.000Z",
    workspace_id: "workspace-id",
    workspace_name: "Workspace",
    subscription_id: "subscription-id",
    integration_id: "notion-integration-id",
    type: overrides.type,
    authors: [{ id: "author-id", type: "person" }],
    attempt_number: 1,
    entity: overrides.entity,
    data: overrides.data ?? {},
  }
}

test("matches the installed authorization bot against public event access", () => {
  expect(notionEventAllowsBot({}, "bot-eu")).toBe(true)
  const event = {
    accessible_by: [
      { type: "person", id: "owner" },
      { type: "bot", id: "bot-eu" },
    ],
  }
  expect(notionEventAllowsBot(event, "bot-eu")).toBe(true)
  expect(notionEventAllowsBot(event, "bot-us")).toBe(false)
  expect(notionEventAllowsBot(event, undefined)).toBe(false)
  expect(notionEventAllowsBot({ accessible_by: [] }, "bot-eu")).toBe(false)
  expect(notionEventAllowsBot({ accessible_by: "bot-eu" }, "bot-eu")).toBe(
    false
  )
})
