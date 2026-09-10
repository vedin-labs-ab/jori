import { convexTest } from "convex-test"
import { vi } from "vitest"
import { sendConsoleMessage } from "../../convex/conversations/send"
import schema from "../../convex/schema"
import { databaseContext, type TestDatabase } from "./database"

type MutationCtx = import("../../convex/_generated/server").MutationCtx

/**
 * Shared hand-rolled Convex fakes for conversation tests: seeded rows, an
 * insert and patch capture, and just enough of the query builder (eq chains,
 * first, unique, order) for the code under test, the billing budget guard
 * included.
 */

export type Seed = [string, Record<string, unknown>]

type FakeCtx = MutationCtx & {
  inserts: Array<{ table: string; doc: unknown }>
  patches: Array<{ id: string; patch: unknown }>
}

export function inserted(ctx: FakeCtx, table: string) {
  return ctx.inserts
    .filter((insert) => insert.table === table)
    .map((insert) => insert.doc)
}

export function fakeMutationCtx(seed: Seed[] = []): FakeCtx {
  const inserts: Array<{ table: string; doc: unknown }> = []
  const patches: Array<{ id: string; patch: unknown }> = []
  const rows = new Map(seed.map(([, doc]) => [String(doc._id), doc]))
  const counters = new Map<string, number>()

  return {
    inserts,
    patches,
    db: {
      get: async (rowId: string) => rows.get(rowId) ?? null,
      insert: async (table: string, doc: Record<string, unknown>) => {
        const count = (counters.get(table) ?? 0) + 1
        const rowId = `${table}-${count}`

        counters.set(table, count)
        rows.set(rowId, { _creationTime: 0, _id: rowId, ...doc })
        inserts.push({ table, doc })

        return rowId
      },
      patch: async (rowId: string, patch: Record<string, unknown>) => {
        rows.set(rowId, { ...rows.get(rowId), ...patch })
        patches.push({ id: rowId, patch })
      },
      query: (table: string) => ({
        withIndex: (_index: string, build: (query: QueryFilter) => unknown) => {
          const filters: [string, unknown][] = []

          build(queryFilter(filters))

          return queryResult(rows, table, filters)
        },
      }),
    },
    scheduler: { runAfter: async () => "scheduled" },
  } as unknown as FakeCtx
}

type QueryFilter = {
  eq: (field: string, value: unknown) => QueryFilter
}

function queryFilter(filters: [string, unknown][]): QueryFilter {
  return {
    eq: (field, value) => {
      filters.push([field, value])
      return queryFilter(filters)
    },
  }
}

function queryResult(
  rows: Map<string, Record<string, unknown>>,
  table: string,
  filters: [string, unknown][]
) {
  const find = async () =>
    [...rows.values()].find(
      (row) => rowTable(row, table) && matches(row, filters)
    ) ?? null
  const result = {
    take: async (limit: number) =>
      [...rows.values()]
        .filter((row) => rowTable(row, table) && matches(row, filters))
        .slice(0, limit),
    first: find,
    unique: find,
    order: (_direction: "asc" | "desc") => result,
  }

  return result
}

function rowTable(row: Record<string, unknown>, table: string) {
  return typeof row._id === "string" && row._id.startsWith(tableIdPrefix(table))
}

function tableIdPrefix(table: string) {
  return table.endsWith("s") ? table.slice(0, -1) : table
}

function matches(row: Record<string, unknown>, filters: [string, unknown][]) {
  return filters.every(([field, value]) => row[field] === value)
}

type Doc<TableName extends keyof DataModel> =
  import("../../convex/_generated/dataModel").Doc<TableName>
type DataModel = import("../../convex/_generated/dataModel").DataModel
type Id<TableName extends keyof DataModel> =
  import("../../convex/_generated/dataModel").Id<TableName>

export const organizationId = "org"

/** The database context with the scheduler a console message reaches for
 *  when it books the thread's summary. */
export function consoleContext() {
  let scheduled = 0
  const scheduler = {
    cancel: vi.fn(async () => undefined),
    runAt: vi.fn(async () => {
      scheduled += 1

      return `scheduled_${scheduled}`
    }),
  }

  return { ...databaseContext({ scheduler }), scheduler }
}

export async function person(database: TestDatabase) {
  return await database.insert("persons", { organizationId })
}

export async function conversationOf(
  database: TestDatabase,
  sent: { conversationId: Id<"conversations"> }
) {
  const conversation = await database.get(sent.conversationId)

  if (conversation === null) {
    throw new Error("Conversation not found.")
  }

  return conversation as unknown as Doc<"conversations">
}

export async function rows<Row>(database: TestDatabase, table: string) {
  return (await database
    .query(table)
    .withIndex("by_id")
    .collect()) as unknown as Row[]
}

/** Ends every run, so the next message opens a new one. */
export async function finishRun(database: TestDatabase) {
  for (const run of await rows<Doc<"runs">>(database, "runs")) {
    await database.patch(run._id, { status: "completed" })
  }
}

const modules = import.meta.glob("/convex/**/*.{ts,js}")

export async function transactionalConsoleContext() {
  const t = convexTest(schema, modules)
  const initial = await t.run(async (ctx) => {
    const people = await Promise.all(
      ["Owner", "Teammate"].map(() =>
        ctx.db.insert("persons", {
          organizationId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      )
    )
    const sent = await sendConsoleMessage(ctx, {
      organizationId,
      personId: people[0],
      profile: { name: "Owner" },
      text: "Prepare the update.",
    })
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", sent.conversationId)
      )
      .unique()

    if (session?.runId === undefined) {
      throw new Error("Fixture session missing.")
    }

    return { ...sent, people, runId: session.runId, sessionId: session._id }
  })
  const send = (personId: Id<"persons">, text: string) =>
    t.run((ctx) =>
      sendConsoleMessage(ctx, {
        conversationId: initial.conversationId,
        organizationId,
        personId,
        profile: {
          name: personId === initial.people[0] ? "Owner" : "Teammate",
        },
        text,
      })
    )

  return { t, ...initial, send }
}
