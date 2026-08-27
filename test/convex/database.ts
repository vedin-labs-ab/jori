import { type MutationCtx } from "../../convex/_generated/server"

// An in-memory stand-in for the Convex database: enough of the surface
// (get, insert, delete, indexed queries) for query-shaped helpers to run
// unchanged in unit tests.

export type StoredDoc = Record<string, unknown> & { _id: string }

type Constraint = { kind: "eq" | "gt"; field: string; value: unknown }

export function createDatabase() {
  const docs = new Map<string, StoredDoc>()
  const tables = new Map<string, StoredDoc[]>()
  let counter = 0

  function rowsOf(table: string) {
    const existing = tables.get(table)

    if (existing !== undefined) {
      return existing
    }

    const created: StoredDoc[] = []

    tables.set(table, created)

    return created
  }

  return {
    normalizeId: (_table: string, id: string) => (id.includes(":") ? id : null),
    get: async (id: string) => docs.get(id) ?? null,
    insert: async (table: string, doc: Record<string, unknown>) => {
      const _id = `${table}:${counter++}`
      const stored = { ...doc, _id }

      docs.set(_id, stored)
      rowsOf(table).push(stored)

      return _id
    },
    delete: async (id: string) => {
      docs.delete(id)

      for (const rows of tables.values()) {
        const index = rows.findIndex((row) => row._id === id)

        if (index >= 0) {
          rows.splice(index, 1)
        }
      }
    },
    query: (table: string) => queryBuilder(rowsOf(table)),
  }
}

export type TestDatabase = ReturnType<typeof createDatabase>

/** The database wrapped as a Convex ctx; storage extras ride along when a
 *  test needs them. */
export function databaseContext(extras: Record<string, unknown> = {}) {
  const database = createDatabase()

  return {
    database,
    ctx: { db: database, ...extras } as unknown as MutationCtx,
  }
}

function queryBuilder(rows: StoredDoc[]) {
  const constraints: Constraint[] = []
  const index = {
    eq: (field: string, value: unknown) => {
      constraints.push({ kind: "eq", field, value })

      return index
    },
    gt: (field: string, value: unknown) => {
      constraints.push({ kind: "gt", field, value })

      return index
    },
  }
  const filtered = () => rows.filter((row) => matches(row, constraints))
  const chain = {
    withIndex: (_name: string, build?: (builder: typeof index) => unknown) => {
      build?.(index)

      return chain
    },
    order: (_direction: string) => chain,
    first: async () => filtered()[0] ?? null,
    unique: async () => {
      const result = filtered()

      if (result.length > 1) {
        throw new Error("Not unique.")
      }

      return result[0] ?? null
    },
    collect: async () => filtered(),
    paginate: async (_opts: unknown) => ({
      page: filtered(),
      isDone: true,
      continueCursor: "",
    }),
  }

  return chain
}

function matches(row: StoredDoc, constraints: Constraint[]) {
  return constraints.every((constraint) =>
    constraint.kind === "eq"
      ? row[constraint.field] === constraint.value
      : (row[constraint.field] as number) > (constraint.value as number)
  )
}
