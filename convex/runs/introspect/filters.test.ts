import { expect, test } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { pageRunMatches } from "./filters"

test("pages no-query runs before projection", async () => {
  const pageMessageId = id<"messages">("page-message")
  const offPageMessageId = id<"messages">("off-page-message")
  const loaded: Id<"messages">[] = []
  const ctx = context(
    new Map([
      [pageMessageId, "Page task"],
      [offPageMessageId, "Off-page task"],
    ]),
    loaded
  )
  const current = run({ _id: id<"runs">("current") })
  const page = await pageRunMatches(
    ctx,
    {
      candidates: [
        messageRun("old", 10, offPageMessageId),
        run({ _id: id<"runs">("new"), createdAt: 40 }),
        messageRun("page", 30, pageMessageId),
        run({ _id: id<"runs">("middle"), createdAt: 20 }),
      ],
      current,
    },
    { cursor: "1", limit: 2 }
  )

  expect(page.cursor).toBe("3")
  expect(page.runs.map((summary) => summary.runId)).toEqual([
    id<"runs">("page"),
    id<"runs">("middle"),
  ])
  expect(loaded).toEqual([pageMessageId])
})

test("filters query matches before pagination", async () => {
  const skipMessageId = id<"messages">("skip-message")
  const matchMessageId = id<"messages">("match-message")
  const loaded: Id<"messages">[] = []
  const ctx = context(
    new Map([
      [skipMessageId, "Skip this task"],
      [matchMessageId, "Matching task"],
    ]),
    loaded
  )
  const current = run({ _id: id<"runs">("current") })
  const page = await pageRunMatches(
    ctx,
    {
      candidates: [
        messageRun("match", 20, matchMessageId),
        messageRun("skip", 30, skipMessageId),
      ],
      current,
      query: "matching",
    },
    { limit: 1 }
  )

  expect(page.cursor).toBe(null)
  expect(page.runs.map((summary) => summary.runId)).toEqual([
    id<"runs">("match"),
  ])
  expect(loaded).toEqual([skipMessageId, matchMessageId])
})

function context(
  messages: Map<Id<"messages">, string>,
  loaded: Id<"messages">[]
) {
  return {
    db: {
      get: async (messageId: Id<"messages">) => {
        loaded.push(messageId)
        const text = messages.get(messageId)

        return text === undefined ? null : message(messageId, text)
      },
    },
  } as unknown as QueryCtx
}

function messageRun(
  runId: string,
  createdAt: number,
  messageId: Id<"messages">
) {
  return run({
    _id: id<"runs">(runId),
    cause: { type: "message", messageId, kind: "mention" },
    createdAt,
    snapshot: {
      context: [],
      source: { type: "message", surface: "slack" },
      title: runId,
    },
  })
}

function run(overrides: Partial<Doc<"runs">>): Doc<"runs"> {
  return {
    _creationTime: 0,
    _id: id<"runs">("run"),
    scope: "tenant",
    cause: { type: "manual" },
    createdAt: 0,
    snapshot: { context: [], source: { type: "manual" }, title: "Run" },
    status: "running",
    tenantId: "tenant",
    ...overrides,
  }
}

function message(messageId: Id<"messages">, text: string): Doc<"messages"> {
  return {
    _creationTime: 0,
    _id: messageId,
    createdAt: 0,
    externalId: messageId,
    integration: "slack",
    integrationId: id<"integrations">("integration"),
    mentioned: true,
    conversationId: "conversation",
    tenantId: "tenant",
    text,
    type: "message",
  }
}

function id<TableName extends "integrations" | "messages" | "runs">(
  value: string
) {
  return value as Id<TableName>
}
