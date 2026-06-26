import { expect, test } from "vitest"
import { type DataModel, type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { syncReactionSnapshot } from "./sync"

test("syncs added and removed reaction snapshot entries", async () => {
  const ctx = fakeMutationCtx([
    ["messages", targetMessage()],
    [
      "reactions",
      reaction("github:reaction:old:added", {
        actor: { externalId: "111", kind: "user", name: "Sarah" },
        reaction: "👍",
      }),
    ],
  ])

  const result = await syncReactionSnapshot(ctx, {
    integration: githubIntegration(),
    target: {
      key: "github:comment:acme/app:123",
      identifiers: ["github:comment:123"],
    },
    reactions: [
      {
        key: "github:reaction:new",
        reaction: "👀",
        actor: { externalId: "222", kind: "user", name: "Albin" },
        observedAt: 2000,
      },
    ],
  })

  expect(result).toEqual({ active: 1, recorded: 2 })
  expect(inserted(ctx, "reactions")).toEqual([
    expect.objectContaining({
      action: "added",
      actor: { externalId: "222", kind: "user", name: "Albin" },
      key: "github:reaction:new:added",
      observedAt: 2000,
      reaction: "👀",
      targetActor: { externalId: "999", kind: "self", name: "milo[bot]" },
      targetText: "Milo reply.",
    }),
    expect.objectContaining({
      action: "removed",
      actor: { externalId: "111", kind: "user", name: "Sarah" },
      key: "github:reaction:old:removed",
      reaction: "👍",
      targetActor: { externalId: "999", kind: "self", name: "milo[bot]" },
      targetText: "Milo reply.",
    }),
  ])
})

function githubIntegration(): Doc<"integrations"> {
  return {
    _id: id<"integrations">("integration"),
    _creationTime: 0,
    tenantId: "tenant",
    integration: "github",
    scope: "tenant",
    externalId: "installation",
    credentials: {},
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
    data: { appSlug: "milo", botLogin: "milo[bot]" },
  }
}

function targetMessage(): Doc<"messages"> {
  return {
    _id: id<"messages">("message"),
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    integration: "github",
    type: "comment.issue.created",
    externalId: "message",
    mentioned: false,
    actor: { externalId: "999", kind: "bot", name: "milo[bot]" },
    conversationId: "acme/app#12",
    targetKey: "github:comment:acme/app:123",
    text: "Milo reply.",
    createdAt: 0,
  }
}

function reaction(
  key: string,
  overrides: Partial<Doc<"reactions">>
): Doc<"reactions"> {
  return {
    _id: id<"reactions">("reaction-old"),
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    integration: "github",
    key,
    action: "added",
    reaction: "👍",
    targetKey: "github:comment:acme/app:123",
    targetIdentifiers: ["github:comment:123"],
    createdAt: 1000,
    ...overrides,
  }
}

function fakeMutationCtx(seed: Seed[] = []): FakeCtx {
  const rows = new Map(seed.map(([, row]) => [String(row._id), row]))
  const inserts: Array<{ table: string; doc: Record<string, unknown> }> = []

  return {
    inserts,
    db: {
      insert: async (table: string, doc: Record<string, unknown>) => {
        const rowId = `${table}-${inserts.length + 1}`
        const row = { _id: rowId, _creationTime: 0, ...doc }

        inserts.push({ table, doc })
        rows.set(rowId, row)

        return rowId
      },
      query: (table: string) => ({
        withIndex: (_index: string, build: (query: QueryFilter) => unknown) => {
          const filters: [string, unknown][] = []
          const query = {
            eq: (field: string, value: unknown) => {
              filters.push([field, value])
              return query
            },
          }

          build(query)

          const result = {
            first: async () => rowsFor(table, rows, filters)[0] ?? null,
            order: (_direction: "asc" | "desc") => result,
            take: async (_limit: number) => rowsFor(table, rows, filters),
          }

          return result
        },
      }),
    },
  } as unknown as FakeCtx
}

function rowsFor(
  table: string,
  rows: Map<string, Record<string, unknown>>,
  filters: [string, unknown][]
) {
  return [...rows.values()].filter(
    (row) => rowTable(row, table) && matches(row, filters)
  )
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

function inserted(ctx: FakeCtx, table: string) {
  return ctx.inserts
    .filter((insert) => insert.table === table)
    .map((insert) => insert.doc)
}

function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
}

type Seed = [string, Record<string, unknown>]
type FakeCtx = MutationCtx & {
  inserts: Array<{ table: string; doc: Record<string, unknown> }>
}
type QueryFilter = {
  eq: (field: string, value: unknown) => QueryFilter
}
