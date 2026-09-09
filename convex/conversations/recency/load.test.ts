import { expect, test } from "vitest"
import {
  databaseContext,
  id,
  type TestDatabase,
} from "../../../test/convex/database"
import { type Doc, type Id } from "../../_generated/dataModel"
import { loadRecentActivity, type RecencyRun } from "./load"

const now = Date.UTC(2026, 6, 2, 8, 57)
const personId = id<"persons">("person")

test("loads organization summaries with conversation-level identifiers", async () => {
  const { database, ctx } = databaseContext()
  const c1 = await seedThread(database, { message: "m1", thread: "t1" })
  const entries = await loadRecentActivity(ctx, query(run("conversation")))

  expect(entries).toMatchObject([
    {
      ageMs: 19 * 60_000,
      conversationId: c1,
      identifiers: [
        `internal:conversation:${c1}`,
        "slack:channel:C1",
        "slack:thread:t1",
      ],
      kind: "summary",
      summary: "Albin wants a cartoon avatar.",
    },
  ])
})

test("keeps narrower context inside the person's own person-scoped run", async () => {
  const { database, ctx } = databaseContext()

  await seedThread(database, {
    message: "m1",
    scope: "conversation",
    thread: "t1",
  })

  const load = (recencyRun: RecencyRun) =>
    loadRecentActivity(ctx, query(recencyRun))

  await expect(load(run("person"))).resolves.toHaveLength(1)
  await expect(load(run("conversation"))).resolves.toHaveLength(0)
  await expect(load(run("organization"))).resolves.toHaveLength(0)
  await expect(
    load({ ...run("person"), personId: id<"persons">("other") })
  ).resolves.toHaveLength(0)
  await expect(
    load({ ...run("person"), personId: undefined })
  ).resolves.toHaveLength(0)
})

test("returns references for conversations already summarized in the run", async () => {
  const { database, ctx } = databaseContext()
  const c1 = await seedThread(database, { message: "m1", thread: "t1" })
  const entries = await loadRecentActivity(ctx, {
    ...query(run("conversation")),
    seen: [c1],
  })

  expect(entries).toEqual([
    {
      conversationId: c1,
      identifiers: [
        `internal:conversation:${c1}`,
        "slack:channel:C1",
        "slack:thread:t1",
      ],
      surface: "slack",
      kind: "reference",
    },
  ])
})

test("applies the privacy gate to references too", async () => {
  const { database, ctx } = databaseContext()
  const c1 = await seedThread(database, {
    message: "m1",
    scope: "conversation",
    thread: "t1",
  })
  const entries = await loadRecentActivity(ctx, {
    ...query(run("conversation")),
    seen: [c1],
  })

  expect(entries).toHaveLength(0)
})

test("caps summaries, skips the current and summaryless conversations", async () => {
  const { database, ctx } = databaseContext()
  const current = await seedThread(database, {
    at: 0,
    message: "m0",
    thread: "current",
  })
  const threads: Id<"conversations">[] = []

  await seedThread(database, {
    at: 7,
    message: "m7",
    summary: null,
    thread: "t7",
  })

  for (const index of [1, 2, 3, 4, 5, 6]) {
    threads.push(
      await seedThread(database, {
        at: index,
        message: `m${index}`,
        thread: `t${index}`,
      })
    )
  }

  const entries = await loadRecentActivity(
    ctx,
    query(run("organization", current))
  )

  expect(entries.map((entry) => entry.conversationId)).toEqual(
    [5, 4, 3, 2, 1].map((index) => threads[index])
  )
})

function query(recencyRun: RecencyRun) {
  return {
    now,
    personId,
    run: recencyRun,
    seen: [],
    organizationId: "organization",
  }
}

function run(
  audience: RecencyRun["audience"],
  conversationId = id<"conversations">("current-conversation")
): RecencyRun {
  return { conversationId, personId, audience }
}

/** One Slack thread the person wrote in: its message, and its
 *  conversation, summarized unless the summary is null. */
async function seedThread(
  database: TestDatabase,
  thread: {
    at?: number
    message: string
    scope?: Doc<"conversations">["scope"]
    summary?: string | null
    thread: string
  }
) {
  await database.insert("messages", {
    organizationId: "organization",
    integrationId: id<"integrations">("integration"),
    surface: "slack",
    type: "message.channels",
    externalId: `slack:team:${thread.message}`,
    mentioned: false,
    actor: { externalId: "U1", kind: "person", name: "Albin" },
    personId,
    conversationId: thread.thread,
    text: "Please help.",
    createdAt: now - 60_000 + (thread.at ?? 0),
    data: {
      channel: { id: "C1" },
      thread: { ts: thread.thread },
      ts: `${thread.message}.000000`,
    },
  })

  return await database.insert("conversations", {
    organizationId: "organization",
    surface: "slack",
    integrationId: id<"integrations">("integration"),
    externalId: thread.thread,
    scope: thread.scope ?? "organization",
    ...(thread.summary === null
      ? {}
      : {
          summarizedAt: now - 19 * 60_000,
          summary: thread.summary ?? "Albin wants a cartoon avatar.",
        }),
  })
}
