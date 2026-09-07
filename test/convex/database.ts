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

type StoredDoc = Record<string, unknown> & { _id: string }

type Constraint = {
  kind: "eq" | "gt" | "gte" | "lt" | "lte"
  field: string
  value: unknown
}

// Sort keys for the named indexes ordered tests rely on. Queries through
// any other index keep insertion order and treat order() as a no-op, as
// tests written before ordering support expect.
const indexSortFields: Record<string, string[]> = {
  by_collection_and_order: ["order"],
  by_conversation_and_created_at: ["createdAt"],
  by_organization_and_created_by_and_updated_at: ["updatedAt"],
  by_organization_and_integration_and_conversation_and_created_at: [
    "createdAt",
  ],
  by_run_and_order: ["order"],
}

function createDatabase() {
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
    gte: (field: string, value: unknown) => {
      constraints.push({ kind: "gte", field, value })

      return index
    },
    lt: (field: string, value: unknown) => {
      constraints.push({ kind: "lt", field, value })

      return index
    },
    lte: (field: string, value: unknown) => {
      constraints.push({ kind: "lte", field, value })

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
      result.sort((left, right) =>
        compareValues(readField(left, field), readField(right, field))
      )
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
      readField(row, reference.field) === value,
}

function matches(row: StoredDoc, constraints: Constraint[]) {
  return constraints.every((constraint) => {
    const field = readField(row, constraint.field)

    if (constraint.kind === "eq") {
      return field === constraint.value
    }

    const comparison = compareValues(field, constraint.value)

    return rangeMatches(constraint.kind, comparison)
  })
}

function rangeMatches(kind: Constraint["kind"], comparison: number) {
  switch (kind) {
    case "eq":
      return comparison === 0
    case "gt":
      return comparison > 0
    case "gte":
      return comparison >= 0
    case "lt":
      return comparison < 0
    case "lte":
      return comparison <= 0
  }
}

/** Index fields may be nested paths ("job.id"); a path through a
 *  missing object reads as undefined, the way Convex indexes it. */
function readField(row: StoredDoc, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        typeof value === "object" && value !== null
          ? (value as Record<string, unknown>)[key]
          : undefined,
      row
    )
}

/** Convex index ordering for the value shapes tests use: a missing field
 *  sorts before every present value, and strings compare as strings so
 *  `YYYY-MM-DD` date ranges read the way the real index reads them. */
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

  if (typeof left === "string" && typeof right === "string") {
    return left < right ? -1 : 1
  }

  return (left as number) < (right as number) ? -1 : 1
}

/** Casts a readable string into a typed document id. Tests seed their own
 *  ids so assertions can name the rows they set up. */
export function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
}
