import { describe, expect, test, vi } from "vitest"
import { tableDoc, testOwner } from "../../test/convex/collections"
import { databaseContext } from "../../test/convex/database"
import { folderDoc } from "../../test/convex/folders"
import { type Id } from "../_generated/dataModel"
import { tableSpec } from "../tables/spec"
import {
  createCollection,
  removeCollection,
  restoreCollection,
  updateCollection,
} from "./records"

function purgeContext() {
  const runAfter = vi.fn(async () => {})
  const { database, ctx } = databaseContext({ scheduler: { runAfter } })

  return { database, ctx, runAfter }
}

const principal = { organizationId: "org", personId: testOwner }

describe("creating a collection", () => {
  test("normalizes the authoring schema and hashes the compiled one", async () => {
    const { ctx } = purgeContext()
    const created = await createCollection(ctx, tableSpec, {
      ...principal,
      name: "  Leads  ",
      authoring: [{ name: "Title", type: "string", required: true }],
    })

    expect(created.name).toBe("Leads")
    expect(created.kind).toBe("table")
    expect(created.columns).toEqual([
      {
        id: expect.stringMatching(/^c_/),
        name: "Title",
        type: "string",
        required: true,
      },
    ])
    expect(created.schemaHash).toMatch(/./)
    expect(created.scope).toBe("organization")
    expect(created.folderId).toBeUndefined()
  })

  test("stamps the folder when creation names one", async () => {
    const { database, ctx } = purgeContext()
    const folderId = await database.insert("folders", folderDoc())

    const created = await createCollection(ctx, tableSpec, {
      ...principal,
      name: "Leads",
      folderId: folderId as Id<"folders">,
      authoring: [{ name: "Title", type: "string" }],
    })

    expect(created.folderId).toBe(folderId)
  })

  test("rejects a folder from another organization", async () => {
    const { database, ctx } = purgeContext()
    const foreignFolder = await database.insert(
      "folders",
      folderDoc({ organizationId: "elsewhere" })
    )

    await expect(
      createCollection(ctx, tableSpec, {
        ...principal,
        name: "Leads",
        folderId: foreignFolder as Id<"folders">,
        authoring: [{ name: "Title", type: "string" }],
      })
    ).rejects.toThrow("Folder was not found.")
  })
})

describe("updating a collection", () => {
  test("evolution rules guard authoring changes", async () => {
    const { ctx } = purgeContext()
    const created = await createCollection(ctx, tableSpec, {
      ...principal,
      name: "Leads",
      authoring: [{ id: "title", name: "Title", type: "string" }],
    })
    // The in-memory database returns live references, so remember the hash
    // before the update mutates the stored document.
    const createdHash = created.schemaHash

    await expect(
      updateCollection(ctx, tableSpec, {
        ...principal,
        collectionId: created._id,
        authoring: [{ id: "title", name: "Title", type: "float" }],
      })
    ).rejects.toThrow("keeps its string type")

    const updated = await updateCollection(ctx, tableSpec, {
      ...principal,
      collectionId: created._id,
      authoring: [
        { id: "title", name: "Renamed", type: "string" },
        { id: "count", name: "Count", type: "integer" },
      ],
    })

    expect(updated?.columns.map((column) => column.id)).toEqual([
      "title",
      "count",
    ])
    expect(updated?.columns[0]?.name).toBe("Renamed")
    expect(updated?.schemaHash).not.toBe(createdHash)
  })
})

describe("removing a collection", () => {
  test("archives an active collection first", async () => {
    const { database, ctx } = purgeContext()
    const collectionId = await database.insert("collections", tableDoc())

    const outcome = await removeCollection(ctx, tableSpec, {
      ...principal,
      collectionId: collectionId as Id<"collections">,
    })

    expect(outcome).toMatchObject({ archived: true })
    expect(await database.get(collectionId)).toMatchObject({
      archivedAt: expect.any(Number),
    })
  })

  test("deletes an archived collection with its documents and shares", async () => {
    const { database, ctx, runAfter } = purgeContext()
    const collectionId = await database.insert(
      "collections",
      tableDoc({ archivedAt: 5 })
    )

    await database.insert("documents", { collectionId, value: {}, version: 1 })
    await database.insert("shares", {
      targetKind: "table",
      targetId: collectionId,
      secret: "s",
      expiresAt: 9,
    })

    const outcome = await removeCollection(ctx, tableSpec, {
      ...principal,
      collectionId: collectionId as Id<"collections">,
    })

    expect(outcome).toMatchObject({ deleted: true })
    expect(await database.get(collectionId)).toBeNull()
    expect(await database.query("documents").collect()).toHaveLength(0)
    expect(await database.query("shares").collect()).toHaveLength(0)
    expect(runAfter).not.toHaveBeenCalled()
  })

  test("reschedules the purge while a full batch remains", async () => {
    const { database, ctx, runAfter } = purgeContext()
    const collectionId = await database.insert(
      "collections",
      tableDoc({ archivedAt: 5 })
    )

    for (let index = 0; index < 200; index += 1) {
      await database.insert("documents", {
        collectionId,
        value: {},
        version: 1,
      })
    }

    await removeCollection(ctx, tableSpec, {
      ...principal,
      collectionId: collectionId as Id<"collections">,
    })

    expect(runAfter).toHaveBeenCalledWith(0, expect.anything(), {
      collectionId,
      kind: "table",
    })
  })
})

describe("restoring a collection", () => {
  test("clears the archive marker", async () => {
    const { database, ctx } = purgeContext()
    const collectionId = await database.insert(
      "collections",
      tableDoc({ archivedAt: 5 })
    )

    const outcome = await restoreCollection(ctx, tableSpec, {
      ...principal,
      collectionId: collectionId as Id<"collections">,
    })

    expect(outcome).toMatchObject({ restored: true })

    const restored = await database.get(collectionId)

    expect(restored).not.toBeNull()
    expect(restored).not.toHaveProperty("archivedAt")
  })
})
