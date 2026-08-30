import { describe, expect, test } from "vitest"
import { storeDoc, tableDoc } from "../../test/convex/collections"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { storeSpec } from "../stores/spec"
import { tableSpec } from "../tables/spec"
import { deleteDocument, insertDocuments, writeDocument } from "./documents"
import { type CollectionDoc } from "./spec"

async function createStore(
  database: TestDatabase,
  overrides: Record<string, unknown> = {}
) {
  const storeId = await database.insert(
    "collections",
    storeDoc({
      schema: { type: "object", additionalProperties: true },
      ...overrides,
    })
  )

  return (await database.get(storeId)) as unknown as CollectionDoc<"store">
}

async function insertRow(
  ctx: Parameters<typeof insertDocuments>[0],
  table: CollectionDoc<"table">,
  values: Record<string, unknown>
) {
  const [row] = await insertDocuments(ctx, tableSpec, table, [values])

  if (row === undefined) {
    throw new Error("Row insert failed.")
  }

  return row
}

async function createTable(
  database: TestDatabase,
  overrides: Record<string, unknown> = {}
) {
  const tableId = await database.insert(
    "collections",
    tableDoc({
      columns: [
        { id: "title", name: "Title", type: "string", required: true },
        { id: "count", name: "Count", type: "integer" },
      ],
      ...overrides,
    })
  )

  return (await database.get(tableId)) as unknown as CollectionDoc<"table">
}

describe("singleton writes", () => {
  test("the first write creates the document at version 1", async () => {
    const { database, ctx } = databaseContext()
    const store = await createStore(database)
    const result = await writeDocument(ctx, storeSpec, store, {
      write: { type: "replace", value: { ready: true } },
    })

    expect(result).toMatchObject({
      status: "written",
      created: true,
      document: { value: { ready: true }, version: 1 },
    })
    expect(await database.query("documents").collect()).toHaveLength(1)
  })

  test("later writes update the same document and bump its version", async () => {
    const { database, ctx } = databaseContext()
    const store = await createStore(database)

    await writeDocument(ctx, storeSpec, store, {
      write: { type: "replace", value: { count: 1 } },
    })

    const result = await writeDocument(ctx, storeSpec, store, {
      write: { type: "merge", patch: { extra: true } },
      expectedVersion: 1,
    })

    expect(result).toMatchObject({
      status: "written",
      created: false,
      document: { value: { count: 1, extra: true }, version: 2 },
    })
    expect(await database.query("documents").collect()).toHaveLength(1)
  })

  test("a singleton refuses batched inserts", async () => {
    const { database, ctx } = databaseContext()
    const store = await createStore(database)

    await expect(insertDocuments(ctx, storeSpec, store, [{}])).rejects.toThrow(
      "holds a single document"
    )
  })

  test("a many-document collection refuses writes without a target", async () => {
    const { database, ctx } = databaseContext()
    const table = await createTable(database)

    await expect(
      writeDocument(ctx, tableSpec, table, {
        write: { type: "replace", value: { title: "x" } },
      })
    ).rejects.toThrow("requires a documentId")
  })
})

describe("claims", () => {
  test("a claim on a free path writes it and reports the new version", async () => {
    const { database, ctx } = databaseContext()
    const store = await createStore(database)
    const result = await writeDocument(ctx, storeSpec, store, {
      write: { type: "claim", path: ["jobs", "j:1"], value: { sent: true } },
    })

    expect(result).toMatchObject({
      status: "written",
      document: { value: { jobs: { "j:1": { sent: true } } }, version: 1 },
    })
  })

  test("a claim on a held path writes nothing and returns the holder", async () => {
    const { database, ctx } = databaseContext()
    const store = await createStore(database)

    await writeDocument(ctx, storeSpec, store, {
      write: { type: "claim", path: ["jobs", "j:1"], value: { sent: true } },
    })

    const result = await writeDocument(ctx, storeSpec, store, {
      write: { type: "claim", path: ["jobs", "j:1"], value: { sent: false } },
    })

    expect(result).toEqual({
      status: "held",
      existing: { sent: true },
      version: 1,
    })
    expect(await database.query("documents").collect()).toHaveLength(1)
  })
})

describe("optimistic versioning", () => {
  test("a stale expected version rejects the write", async () => {
    const { database, ctx } = databaseContext()
    const store = await createStore(database)

    await writeDocument(ctx, storeSpec, store, {
      write: { type: "replace", value: {} },
    })

    await expect(
      writeDocument(ctx, storeSpec, store, {
        write: { type: "replace", value: {} },
        expectedVersion: 0,
      })
    ).rejects.toThrow("Store Settings version conflict: expected 0, found 1")
  })

  test("a stale expected version rejects a row delete", async () => {
    const { database, ctx } = databaseContext()
    const table = await createTable(database)
    const row = await insertRow(ctx, table, { title: "Launch" })

    await expect(
      deleteDocument(ctx, tableSpec, table, {
        documentId: row._id,
        expectedVersion: 4,
      })
    ).rejects.toThrow("Row version conflict")
  })
})

describe("validation against the compiled schema", () => {
  test("typed columns accept matching rows and reject mismatches", async () => {
    const { database, ctx } = databaseContext()
    const table = await createTable(database)

    await expect(
      insertDocuments(ctx, tableSpec, table, [{ title: "Launch", count: 3 }])
    ).resolves.toHaveLength(1)
    await expect(
      insertDocuments(ctx, tableSpec, table, [{ title: "x", count: 1.5 }])
    ).rejects.toThrow("must be integer")
    await expect(
      insertDocuments(ctx, tableSpec, table, [{ count: 1 }])
    ).rejects.toThrow("is required")
    await expect(
      insertDocuments(ctx, tableSpec, table, [{ title: "x", extra: true }])
    ).rejects.toThrow("is not allowed")
  })

  test("a batch with one invalid row inserts nothing", async () => {
    const { database, ctx } = databaseContext()
    const table = await createTable(database)

    await expect(
      insertDocuments(ctx, tableSpec, table, [{ title: "ok" }, { title: 4 }])
    ).rejects.toThrow("must be string")
    expect(await database.query("documents").collect()).toHaveLength(0)
  })

  test("row updates merge, clear nulled columns, and revalidate", async () => {
    const { database, ctx } = databaseContext()
    const table = await createTable(database)
    const row = await insertRow(ctx, table, { title: "Launch", count: 3 })
    const documentId = row._id

    const updated = await writeDocument(ctx, tableSpec, table, {
      documentId,
      write: { type: "merge", patch: { count: null } },
      expectedVersion: 1,
    })

    expect(updated).toMatchObject({
      status: "written",
      document: { value: { title: "Launch" }, version: 2 },
    })
    await expect(
      writeDocument(ctx, tableSpec, table, {
        documentId,
        write: { type: "merge", patch: { title: null } },
      })
    ).rejects.toThrow("is required")
  })

  test("store values must stay Convex-safe", async () => {
    const { database, ctx } = databaseContext()
    const store = await createStore(database)

    await expect(
      writeDocument(ctx, storeSpec, store, {
        write: { type: "replace", value: { _bad: {} } },
      })
    ).rejects.toThrow("Convex-safe")
  })
})

describe("archived collections", () => {
  test("refuse document writes until restored", async () => {
    const { database, ctx } = databaseContext()
    const store = await createStore(database, { archivedAt: 5 })
    const table = await createTable(database, { archivedAt: 5 })

    await expect(
      writeDocument(ctx, storeSpec, store, {
        write: { type: "replace", value: {} },
      })
    ).rejects.toThrow("Store is archived")
    await expect(
      insertDocuments(ctx, tableSpec, table, [{ title: "x" }])
    ).rejects.toThrow("Table is archived")
  })
})
