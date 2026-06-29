import { type Actor } from "../../shared/actor"

type NotionEntity = {
  id: string
  type: string
}

type NotionParent = {
  id: string
  type: string
}

export type NotionAutomationEvent = {
  workspaceId: string
  key: string
  type: "comment.created" | "page.updated"
  match: Record<string, string>
  actor?: Actor
  pageId: string
  data: Record<string, unknown>
  observedAt?: number
}

const pageUpdateEvents = new Set([
  "page.content_updated",
  "page.properties_updated",
])

export function readNotionAutomationEvents(
  payload: unknown
): NotionAutomationEvent[] {
  const event = readNotionEvent(payload)

  if (event === null) {
    return []
  }

  return [...readPageUpdatedEvent(event), ...readCommentCreatedEvent(event)]
}

function readPageUpdatedEvent(event: NotionEvent) {
  if (!pageUpdateEvents.has(event.type) || event.entity.type !== "page") {
    return []
  }

  return [
    createAutomationEvent(event, {
      type: "page.updated",
      pageId: event.entity.id,
      match: { page: event.entity.id },
      data: { pageId: event.entity.id },
    }),
  ]
}

function readCommentCreatedEvent(event: NotionEvent) {
  const pageId = readString(event.rawData, "page_id")

  if (
    event.type !== "comment.created" ||
    event.entity.type !== "comment" ||
    pageId === undefined
  ) {
    return []
  }

  return [
    createAutomationEvent(event, {
      type: "comment.created",
      pageId,
      match: { page: pageId },
      data: {
        commentId: event.entity.id,
        pageId,
      },
    }),
  ]
}

function createAutomationEvent(
  event: NotionEvent,
  automationEvent: {
    type: NotionAutomationEvent["type"]
    pageId: string
    match: Record<string, string>
    data: Record<string, unknown>
  }
): NotionAutomationEvent {
  return {
    workspaceId: event.workspaceId,
    key: `notion:${event.workspaceId}:${event.id}:${automationEvent.type}`,
    type: automationEvent.type,
    match: automationEvent.match,
    actor: event.actor,
    pageId: automationEvent.pageId,
    data: {
      notionEventId: event.id,
      notionEventType: event.type,
      workspaceId: event.workspaceId,
      workspaceName: event.workspaceName,
      subscriptionId: event.subscriptionId,
      notionIntegrationId: event.integrationId,
      attemptNumber: event.attemptNumber,
      apiVersion: event.apiVersion,
      entity: event.entity,
      parent: event.parent,
      ...automationEvent.data,
    },
    observedAt: event.observedAt,
  }
}

type NotionEvent = {
  id: string
  type: string
  workspaceId: string
  workspaceName?: string
  subscriptionId?: string
  integrationId?: string
  attemptNumber?: number
  apiVersion?: string
  entity: NotionEntity
  parent?: NotionParent
  actor?: Actor
  rawData: Record<string, unknown>
  observedAt?: number
}

function readNotionEvent(payload: unknown): NotionEvent | null {
  const record = readRecord(payload)
  const id = readString(record, "id")
  const type = readString(record, "type")
  const workspaceId = readString(record, "workspace_id")
  const entity = readEntity(record)

  if (
    id === undefined ||
    type === undefined ||
    workspaceId === undefined ||
    entity === undefined
  ) {
    return null
  }

  const rawData = readRecord(readValue(record, "data"))

  return {
    id,
    type,
    workspaceId,
    workspaceName: readString(record, "workspace_name"),
    subscriptionId: readString(record, "subscription_id"),
    integrationId: readString(record, "integration_id"),
    attemptNumber: readNumber(record, "attempt_number"),
    apiVersion: readString(record, "api_version"),
    entity,
    parent: readParent(rawData),
    actor: readAuthor(record),
    rawData,
    observedAt: readTimestamp(record),
  }
}

function readEntity(record: Record<string, unknown>) {
  return readIdTypeObject(readValue(record, "entity"))
}

function readParent(record: Record<string, unknown>) {
  return readIdTypeObject(readValue(record, "parent"))
}

function readIdTypeObject(value: unknown): NotionEntity | undefined {
  const record = readRecord(value)
  const id = readString(record, "id")
  const type = readString(record, "type")

  if (id === undefined || type === undefined) {
    return undefined
  }

  return { id, type }
}

function readAuthor(record: Record<string, unknown>): Actor | undefined {
  const author = readArray(readValue(record, "authors"))
    .map(readIdTypeObject)
    .find((candidate) => candidate !== undefined)

  return author === undefined
    ? undefined
    : {
        kind: "person",
        externalId: author.id,
      }
}

function readTimestamp(record: Record<string, unknown>) {
  const timestamp = readString(record, "timestamp")

  if (timestamp === undefined) {
    return undefined
  }

  const milliseconds = Date.parse(timestamp)

  return Number.isFinite(milliseconds) ? milliseconds : undefined
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : []
}

function readValue(record: Record<string, unknown>, key: string) {
  return record[key]
}

function readString(record: Record<string, unknown>, key: string) {
  const value = readValue(record, key)

  return typeof value === "string" && value !== "" ? value : undefined
}

function readNumber(record: Record<string, unknown>, key: string) {
  const value = readValue(record, key)

  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}
