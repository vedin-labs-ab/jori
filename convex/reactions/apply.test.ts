import { expect, test } from "vitest"
import { id } from "../../test/convex/database"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { reconcileTargetReactions, recordReactionEvent } from "./apply"

const target = {
  key: "github:comment:acme/app:123",
  identifiers: ["github:comment:123"],
}
const albin = { externalId: "456", kind: "person" as const, name: "Albin" }
const sarah = { externalId: "789", kind: "person" as const, name: "Sarah" }

test("reconcile inserts present reactions and tombstones absent ones", async () => {
  const ctx = fakeMutationCtx([["messages", targetMessage()]])

  const first = await reconcileTargetReactions(ctx, {
    integration: githubIntegration(),
    reactions: [{ reaction: "👍", actor: albin }],
    target,
  })
  expect(first).toEqual({ active: 1, recorded: 1 })

  await reconcileTargetReactions(ctx, {
    integration: githubIntegration(),
    reactions: [
      { reaction: "👍", actor: albin },
      { reaction: "👀", actor: sarah },
    ],
    target,
  })

  const removal = await reconcileTargetReactions(ctx, {
    integration: githubIntegration(),
    reactions: [{ reaction: "👀", actor: sarah }],
    target,
  })
  expect(removal).toEqual({ active: 1, recorded: 1 })

  const rows = reactionRows(ctx)
  expect(rows).toHaveLength(2)
  expect(rows.filter(isActive).map((row) => row.reaction)).toEqual(["👀"])
  expect(rows.every((row) => typeof row.observedAt === "number")).toBe(true)
  expect(rows.every((row) => row.target.key === target.key)).toBe(true)
})

test("re-adding a removed reaction reuses the row and clears the tombstone", async () => {
  const ctx = fakeMutationCtx([["messages", targetMessage()]])

  await reconcileTargetReactions(ctx, {
    integration: githubIntegration(),
    reactions: [{ reaction: "👍", actor: albin }],
    target,
  })
  await reconcileTargetReactions(ctx, {
    integration: githubIntegration(),
    reactions: [],
    target,
  })

  const removed = reactionRows(ctx)
  expect(removed).toHaveLength(1)
  expect(typeof removed[0].removedAt).toBe("number")

  await reconcileTargetReactions(ctx, {
    integration: githubIntegration(),
    reactions: [{ reaction: "👍", actor: albin }],
    target,
  })

  const readded = reactionRows(ctx)
  expect(readded).toHaveLength(1)
  expect(readded[0].removedAt).toBeUndefined()
  expect(readded[0].updatedAt).toBeGreaterThan(removed[0].updatedAt)
})

test("event removal then re-add toggles the same row", async () => {
  const ctx = fakeMutationCtx([["messages", targetMessage()]])

  for (const action of ["added", "removed", "added"] as const) {
    await recordReactionEvent(ctx, {
      action,
      actor: albin,
      integration: githubIntegration(),
      reaction: "👍",
      target,
    })
  }

  const rows = reactionRows(ctx)
  expect(rows).toHaveLength(1)
  expect(rows[0].removedAt).toBeUndefined()
})

function isActive(row: Doc<"reactions">) {
  return row.removedAt === undefined
}

function reactionRows(ctx: FakeCtx) {
  return [...ctx.rows.values()].filter(
    (row): row is Doc<"reactions"> =>
      typeof row._id === "string" && row._id.startsWith("reaction")
  )
}

function githubIntegration(): Doc<"integrations"> {
  return {
    _id: id<"integrations">("integration"),
    _creationTime: 0,
    organizationId: "organization",
    integration: "github",
    scope: "organization",
    externalId: "installation",
    credentials: {},
    status: "active",
    createdBy: "person" as Id<"persons">,
    createdAt: 0,
    updatedAt: 0,
    data: { appSlug: "jori", botLogin: "jori[bot]" },
  }
}

function targetMessage(): Doc<"messages"> {
  return {
    _id: id<"messages">("message"),
    _creationTime: 0,
    organizationId: "organization",
    integrationId: id<"integrations">("integration"),
    integration: "github",
    type: "comment.issue.created",
    externalId: "message",
    mentioned: false,
    actor: { externalId: "999", kind: "bot", name: "jori[bot]" },
    conversationId: "acme/app#12",
    targetKey: target.key,
    text: "Jori reply.",
    createdAt: 0,
  }
}

function fakeMutationCtx(seed: Seed[] = []): FakeCtx {
  const rows = new Map<string, Record<string, unknown>>(
    seed.map(([, row]) => [String(row._id), row])
  )
  let inserts = 0

  return {
    rows,
    db: {
      insert: async (table: string, doc: Record<string, unknown>) => {
        inserts += 1
        const rowId = `${tableIdPrefix(table)}-${inserts}`
        rows.set(rowId, { _id: rowId, _creationTime: inserts, ...doc })

        return rowId
      },
      patch: async (rowId: string, patch: Record<string, unknown>) => {
        rows.set(rowId, { ...rows.get(rowId), ...patch })
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

          const matched = rowsFor(table, rows, filters)
          const result = {
            first: async () => matched[0] ?? null,
            take: async (limit: number) => matched.slice(0, limit),
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
  const prefix = tableIdPrefix(table)

  return [...rows.values()].filter(
    (row) =>
      typeof row._id === "string" &&
      row._id.startsWith(prefix) &&
      filters.every(([field, value]) => fieldValue(row, field) === value)
  )
}

function fieldValue(row: Record<string, unknown>, field: string) {
  return field.split(".").reduce<unknown>((value, key) => {
    if (typeof value !== "object" || value === null) {
      return undefined
    }

    return (value as Record<string, unknown>)[key]
  }, row)
}

function tableIdPrefix(table: string) {
  return table.endsWith("s") ? table.slice(0, -1) : table
}

type Seed = [string, Record<string, unknown>]
type FakeCtx = MutationCtx & {
  rows: Map<string, Record<string, unknown>>
}
type QueryFilter = {
  eq: (field: string, value: unknown) => QueryFilter
}
