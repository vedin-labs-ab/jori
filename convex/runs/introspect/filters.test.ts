import { expect, test } from "vitest"
import { id } from "../../../test/convex/database"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { pageRunMatches } from "./filters"
import { type SearchRunsArgs } from "./schema"

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
  const filters = {
    mode: "search" as const,
    candidates: [
      messageRun("old", 10, offPageMessageId),
      run({ _id: id<"runs">("new"), createdAt: 40 }),
      messageRun("page", 30, pageMessageId),
      run({ _id: id<"runs">("middle"), createdAt: 20 }),
    ],
    current,
  }
  const first = await pageRunMatches(ctx, filters, { limit: 1 })
  const page = await pageRunMatches(ctx, filters, {
    cursor: requiredCursor(first),
    limit: 2,
  })

  expect(page.cursor).toEqual(expect.any(String))
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
      mode: "search",
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

test("new and newly completed runs ahead of the cursor never repeat a page", async () => {
  const ctx = context(new Map(), [])
  const firstRun = run({
    _id: id<"runs">("first"),
    createdAt: 30,
    status: "completed",
  })
  const older = run({
    _id: id<"runs">("older"),
    createdAt: 20,
    status: "completed",
  })
  const pending = run({ _id: id<"runs">("pending"), createdAt: 40 })
  const filters = search([firstRun, older, pending], {
    scope: "all",
    status: "completed",
  })
  const first = await pageRunMatches(ctx, filters, { limit: 1 })
  expect(first.runs.map((item) => item.runId)).toEqual([firstRun._id])

  pending.status = "completed"
  filters.candidates.push(
    run({ _id: id<"runs">("inserted"), createdAt: 50, status: "completed" })
  )
  const second = await pageRunMatches(ctx, filters, {
    limit: 1,
    cursor: requiredCursor(first),
  })
  expect(second.runs.map((item) => item.runId)).toEqual([older._id])
  expect(second.cursor).toBeNull()

  const refreshed = await pageRunMatches(ctx, filters, { limit: 2 })
  expect(refreshed.runs.map((item) => item.runId)).toEqual([
    id<"runs">("inserted"),
    pending._id,
  ])
})

test("keeps query, source, time and visibility filters on continuation", async () => {
  const ctx = context(new Map(), [])
  const eligible = [40, 30, 20, 10].map((createdAt) => ({
    ...messageRun(
      `match-${createdAt}`,
      createdAt,
      id<"messages">(`message-${createdAt}`)
    ),
    status: "completed" as const,
  }))
  const filters = search(
    [
      ...eligible,
      { ...eligible[1], _id: id<"runs">("foreign"), organizationId: "other" },
      {
        ...eligible[1],
        _id: id<"runs">("private"),
        audience: "person" as const,
      },
      {
        ...eligible[1],
        _id: id<"runs">("wrong-status"),
        status: "failed" as const,
      },
      {
        ...messageRun("wrong-query", 25, id<"messages">("missing")),
        status: "completed" as const,
      },
      run({
        _id: id<"runs">("wrong-source"),
        createdAt: 25,
        status: "completed",
      }),
    ],
    {
      query: "match",
      source: "slack",
      status: "completed",
      since: 20,
      until: 30,
      scope: "all",
    }
  )
  const first = await pageRunMatches(ctx, filters, { limit: 1 })
  const second = await pageRunMatches(ctx, filters, {
    limit: 1,
    cursor: requiredCursor(first),
  })
  expect(first.runs.map((item) => item.runId)).toEqual([id<"runs">("match-30")])
  expect(second.runs.map((item) => item.runId)).toEqual([
    id<"runs">("match-20"),
  ])
  expect(second.cursor).toBeNull()
})

function search(candidates: Doc<"runs">[], args: Partial<SearchRunsArgs> = {}) {
  return { current: run({}), candidates, mode: "search" as const, ...args }
}

function requiredCursor(page: { cursor: string | null }) {
  expect(page.cursor).toEqual(expect.any(String))
  if (page.cursor === null) {
    throw new Error("Expected another page")
  }
  return page.cursor
}

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
    principal: { kind: "organization" },
    audience: "organization",
    cause: { type: "manual" },
    createdAt: 0,
    snapshot: { context: [], source: { type: "manual" }, title: "Run" },
    status: "running",
    organizationId: "organization",
    ...overrides,
  }
}

function message(messageId: Id<"messages">, text: string): Doc<"messages"> {
  return {
    _creationTime: 0,
    _id: messageId,
    createdAt: 0,
    externalId: messageId,
    surface: "slack",
    integrationId: id<"integrations">("integration"),
    mentioned: true,
    conversationId: "conversation",
    organizationId: "organization",
    text,
    type: "message",
  }
}
