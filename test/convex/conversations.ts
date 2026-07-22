type DataModel = import("../../convex/_generated/dataModel").DataModel
type Id<TableName extends keyof DataModel> =
  import("../../convex/_generated/dataModel").Id<TableName>
type MutationCtx = import("../../convex/_generated/server").MutationCtx

/**
 * Shared hand-rolled Convex fakes for conversation tests: seeded rows, an
 * insert and patch capture, and just enough of the query builder (eq chains,
 * first, unique, order) for the code under test, the billing budget guard
 * included.
 */

export type Seed = [string, Record<string, unknown>]

export type FakeCtx = MutationCtx & {
  inserts: Array<{ table: string; doc: unknown }>
  patches: Array<{ id: string; patch: unknown }>
}

export function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
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
