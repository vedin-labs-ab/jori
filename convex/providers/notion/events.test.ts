import { expect, test } from "vitest"
import { readNotionAutomationEvents } from "./events"

test("projects Notion page content updates to page events", () => {
  const events = readNotionAutomationEvents(
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
      resource: "page-id",
      criteria: { page: "page-id" },
      actor: { provider: "notion", externalId: "author-id" },
      observedAt: Date.parse("2026-06-12T08:00:00.000Z"),
      data: expect.objectContaining({
        pageId: "page-id",
        notionEventId: "notion-event-id",
        notionEventType: "page.content_updated",
        parent: { id: "parent-page-id", type: "page" },
        updatedBlocks: [{ id: "block-id", type: "block" }],
      }),
    }),
  ])
})

test("projects Notion data source child page updates to item events", () => {
  const events = readNotionAutomationEvents(
    notionPayload({
      type: "page.properties_updated",
      entity: { id: "page-id", type: "page" },
      data: {
        parent: { id: "data-source-id", type: "data_source" },
        updated_properties: [{ id: "property-id", action: "updated" }],
      },
    })
  )

  expect(events.map((event) => event.type)).toEqual([
    "page.updated",
    "data_source.item.changed",
  ])
  expect(events[1]).toEqual(
    expect.objectContaining({
      key: "notion:workspace-id:notion-event-id:data_source.item.changed",
      resource: "data-source-id",
      criteria: { dataSource: "data-source-id", page: "page-id" },
      data: expect.objectContaining({
        dataSourceId: "data-source-id",
        pageId: "page-id",
        updatedProperties: [{ id: "property-id", action: "updated" }],
      }),
    })
  )
})

test("projects Notion data source content updates to item events", () => {
  const events = readNotionAutomationEvents(
    notionPayload({
      type: "data_source.content_updated",
      entity: { id: "data-source-id", type: "data_source" },
      data: {
        parent: { id: "page-id", type: "page" },
      },
    })
  )

  expect(events).toEqual([
    expect.objectContaining({
      type: "data_source.item.changed",
      resource: "data-source-id",
      criteria: { dataSource: "data-source-id" },
      data: expect.objectContaining({
        dataSourceId: "data-source-id",
      }),
    }),
  ])
})

test("projects Notion created comments to page comment events", () => {
  const events = readNotionAutomationEvents(
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
      resource: "page-id",
      criteria: { page: "page-id" },
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
    readNotionAutomationEvents({
      verification_token: "secret_token",
    })
  ).toEqual([])
  expect(
    readNotionAutomationEvents(
      notionPayload({
        type: "comment.updated",
        entity: { id: "comment-id", type: "comment" },
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
