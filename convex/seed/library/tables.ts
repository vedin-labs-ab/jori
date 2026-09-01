import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { insertDocuments, writeDocument } from "../../collections/documents"
import { createCollection } from "../../collections/records"
import { storeSpec } from "../../stores/spec"
import { tableSpec } from "../../tables/spec"
import { daysAgo, type SeedContext } from "../context"
import { resolveOwner } from "../people"
import { commercialTables } from "./commercial"
import { resolveFolders } from "./folders"
import { operationsTables } from "./operations"
import { type SeedColumn, type SeedStore, type SeedTable } from "./shape"
import { stores } from "./values"

// Tables and stores both go in through the collection chokepoints, so the
// compiled schema, the document count, and the row order are exactly what the
// product would have written. Only the timestamps are ours: a collection is
// backdated afterwards so the console shows a library that grew over months
// rather than one that appeared at once.

export async function seedCollections(ctx: MutationCtx, seed: SeedContext) {
  const ownerId = await resolveOwner(ctx, seed)
  const folders = await resolveFolders(ctx, seed)

  await clearCollections(ctx, seed)

  for (const table of [...commercialTables, ...operationsTables]) {
    await writeTable(ctx, seed, { table, ownerId, folders })
  }

  for (const store of stores) {
    await writeStore(ctx, seed, { store, ownerId, folders })
  }

  return commercialTables.length + operationsTables.length + stores.length
}

async function writeTable(
  ctx: MutationCtx,
  seed: SeedContext,
  args: {
    table: SeedTable
    ownerId: Id<"persons">
    folders: Map<string, Id<"folders">>
  }
) {
  const columns = args.table.columns.map(toColumn)
  const collection = await createCollection(ctx, tableSpec, {
    organizationId: seed.organizationId,
    personId: args.ownerId,
    name: args.table.name,
    description: args.table.description,
    folderId: args.folders.get(args.table.folder),
    authoring: columns,
  })

  await insertDocuments(
    ctx,
    tableSpec,
    collection,
    args.table.rows.map((row) => toRow(columns, row))
  )

  await backdate(ctx, seed, collection._id, args.table)
}

async function writeStore(
  ctx: MutationCtx,
  seed: SeedContext,
  args: {
    store: SeedStore
    ownerId: Id<"persons">
    folders: Map<string, Id<"folders">>
  }
) {
  const collection = await createCollection(ctx, storeSpec, {
    organizationId: seed.organizationId,
    personId: args.ownerId,
    name: args.store.name,
    description: args.store.description,
    folderId: args.folders.get(args.store.folder),
    authoring: args.store.schema ?? null,
  })

  await writeDocument(ctx, storeSpec, collection, {
    write: { type: "replace", value: args.store.value },
  })

  await backdate(ctx, seed, collection._id, args.store)
}

/** A column's hidden id is normally generated; here it is derived from the
 *  name so a fixture row can be read against its header. */
function toColumn([name, type]: SeedColumn) {
  return {
    id: name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_"),
    name,
    type,
  }
}

function toRow(
  columns: ReturnType<typeof toColumn>[],
  row: (string | number | boolean)[]
) {
  return Object.fromEntries(
    columns.map((column, index) => [column.id, row[index]])
  )
}

/** Collections are stamped with the current time on the way in, which would
 *  show a whole library created in the same second. */
async function backdate(
  ctx: MutationCtx,
  seed: SeedContext,
  collectionId: Id<"collections">,
  fixture: { created: number; updated: number }
) {
  await ctx.db.patch(collectionId, {
    createdAt: daysAgo(seed, fixture.created, 10),
    updatedAt: daysAgo(seed, fixture.updated, 15),
  })
}

/** A re-run replaces its own library. Documents hang off collections rather
 *  than off the organization, so they are cleared through the collections
 *  being removed — never by sweeping the documents table, which would reach
 *  into collections this seed does not own. */
async function clearCollections(ctx: MutationCtx, seed: SeedContext) {
  const collections = await ctx.db
    .query("collections")
    .filter((row) => row.eq(row.field("organizationId"), seed.organizationId))
    .collect()

  for (const collection of collections) {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_collection", (index) =>
        index.eq("collectionId", collection._id)
      )
      .collect()

    for (const document of documents) {
      await ctx.db.delete(document._id)
    }

    await ctx.db.delete(collection._id)
  }
}
