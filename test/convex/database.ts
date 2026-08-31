import { type MutationCtx } from "../../convex/_generated/server"

// dataModel only ships types, so it is referenced through import types: a
// value-position import statement would survive transpilation and fail to
// resolve at test runtime.
type DataModel = import("../../convex/_generated/dataModel").DataModel
type Id<TableName extends keyof DataModel> =
  import("../../convex/_generated/dataModel").Id<TableName>

// An in-memory stand-in for the Convex database: enough of the surface
// (get, insert, delete, indexed queries) for query-shaped helpers to run
// unchanged in unit tests.

export type StoredDoc = Record<string, unknown> & { _id: string }

type Constraint = { kind: "eq" | "gt" | "lt"; field: string; value: unknown }

// Sort keys for the named indexes ordered tests rely on. Queries through
// any other index keep insertion order and treat order() as a no-op, as
// tests written before ordering support expect.
const indexSortFields: Record<string, string[]> = {
  by_collection_and_order: ["order"],
}

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
    // Typed like the real insert, so seeded ids flow into helpers without
    // a cast and a wrong-table id is a typecheck failure.
    insert: async <TableName extends keyof DataModel>(
      table: TableName,
      doc: Record<string, unknown>
    ) => {
      const _id = `${table}:${counter++}`
      // Monotonic like the real system field, so keyset iteration works.
      const stored = { _creationTime: counter, ...doc, _id }

      docs.set(_id, stored)
      rowsOf(table).push(stored)

      return _id as Id<TableName>
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
    // Convex patch semantics: undefined values remove the field.
    patch: async (id: string, value: Record<string, unknown>) => {
      const stored = docs.get(id)

      if (stored === undefined) {
        throw new Error(`Missing document: ${id}`)
      }

      for (const [field, fieldValue] of Object.entries(value)) {
        if (fieldValue === undefined) {
          delete stored[field]
        } else {
          stored[field] = fieldValue
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

function constraintBuilder(constraints: Constraint[]) {
  const index = {
    eq: (field: string, value: unknown) => {
      constraints.push({ kind: "eq", field, value })

      return index
    },
    gt: (field: string, value: unknown) => {
      constraints.push({ kind: "gt", field, value })

      return index
    },
    lt: (field: string, value: unknown) => {
      constraints.push({ kind: "lt", field, value })

      return index
    },
  }

  return index
}

function queryBuilder(rows: StoredDoc[]) {
  const constraints: Constraint[] = []
  const predicates: FilterPredicate[] = []
  let sortFields: string[] = []
  let descending = false
  const index = constraintBuilder(constraints)
  const filtered = () => {
    const result = rows.filter(
      (row) =>
        matches(row, constraints) &&
        predicates.every((predicate) => predicate(row))
    )

    if (sortFields.length === 0) {
      return result
    }

    for (const field of [...sortFields].reverse()) {
      result.sort((left, right) => compareValues(left[field], right[field]))
    }

    return descending ? result.reverse() : result
  }
  const chain = {
    withIndex: (name: string, build?: (builder: typeof index) => unknown) => {
      sortFields = indexSortFields[name] ?? []
      build?.(index)

      return chain
    },
    // Just the `query.eq(query.field(name), value)` shape Convex filters
    // usually take; extend when a test needs more of the expression API.
    filter: (build: (builder: typeof filterBuilder) => FilterPredicate) => {
      predicates.push(build(filterBuilder))

      return chain
    },
    order: (direction: string) => {
      descending = direction === "desc"

      return chain
    },
    first: async () => filtered()[0] ?? null,
    unique: async () => {
      const result = filtered()

      if (result.length > 1) {
        throw new Error("Not unique.")
      }

      return result[0] ?? null
    },
    collect: async () => filtered(),
    take: async (count: number) => filtered().slice(0, count),
    // Convex queries are async-iterable; helpers stream rows this way.
    async *[Symbol.asyncIterator]() {
      yield* filtered()
    },
    // Real pagination semantics over the fake's ordering: the cursor is
    // the offset already served, so tests can walk a table window by
    // window the way `usePaginatedQuery` does.
    paginate: async (opts: { cursor: string | null; numItems: number }) => {
      const all = filtered()
      const start = opts.cursor === null ? 0 : Number(opts.cursor)
      const page = all.slice(start, start + opts.numItems)
      const served = start + page.length

      return {
        page,
        isDone: served >= all.length,
        continueCursor: String(served),
      }
    },
  }

  return chain
}

type FilterPredicate = (row: StoredDoc) => boolean

type FieldReference = { field: string }

const filterBuilder = {
  field: (field: string): FieldReference => ({ field }),
  eq:
    (reference: FieldReference, value: unknown): FilterPredicate =>
    (row) =>
      row[reference.field] === value,
}

function matches(row: StoredDoc, constraints: Constraint[]) {
  return constraints.every((constraint) => {
    if (constraint.kind === "eq") {
      return row[constraint.field] === constraint.value
    }

    const comparison = compareValues(row[constraint.field], constraint.value)

    return constraint.kind === "gt" ? comparison > 0 : comparison < 0
  })
}

/** Convex index ordering for the value shapes tests use: a missing field
 *  sorts before every present value. */
function compareValues(left: unknown, right: unknown) {
  if (left === right) {
    return 0
  }

  if (left === undefined) {
    return -1
  }

  if (right === undefined) {
    return 1
  }

  return (left as number) < (right as number) ? -1 : 1
}

/** Casts a readable string into a typed document id. Tests seed their own
 *  ids so assertions can name the rows they set up. */
export function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
}
