import { v } from "convex/values"
import { isRecord } from "../../contracts/json"
import {
  normalizeTableColumns,
  readStoredColumns,
  type TableColumn,
} from "../../contracts/tables/columns"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import {
  createCollection,
  removeCollection,
  restoreCollection,
  updateCollection,
} from "../collections/records"
import { type CollectionDoc } from "../collections/spec"
import { visibilityValidator } from "../visibility/schema"
import { getAccessibleTable, summarizeTable } from "./access"
import { tableSpec } from "./spec"

export const create = internalMutation({
  args: {
    organizationId: v.string(),
    personId: v.id("persons"),
    name: v.string(),
    description: v.optional(v.string()),
    visibility: v.optional(visibilityValidator),
    folderId: v.optional(v.id("folders")),
    columns: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const table = await createCollection(ctx, tableSpec, {
      ...args,
      authoring: args.columns ?? [],
    })

    return summarizeTable(table)
  },
})

export const update = internalMutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("collections"),
    personId: v.id("persons"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    columns: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const change =
      args.columns === undefined
        ? undefined
        : await planColumnChange(ctx, { ...args, columns: args.columns })
    const table = await updateCollection(ctx, tableSpec, {
      organizationId: args.organizationId,
      collectionId: args.tableId,
      personId: args.personId,
      name: args.name,
      description: args.description,
      authoring: change?.next,
    })

    if (change !== undefined && change.removed.length > 0) {
      await ctx.scheduler.runAfter(0, internal.tables.records.scrub, {
        tableId: args.tableId,
        columnIds: change.removed,
      })
    }

    return table === null ? null : summarizeTable(table)
  },
})

/** Archive an active table; removing an archived one deletes it and its
 *  rows permanently. */
export const remove = internalMutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("collections"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    const { collectionId, ...outcome } = await removeCollection(
      ctx,
      tableSpec,
      { ...args, collectionId: args.tableId }
    )

    return { tableId: collectionId, ...outcome }
  },
})

export const restore = internalMutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("collections"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    const { collectionId, ...outcome } = await restoreCollection(
      ctx,
      tableSpec,
      { ...args, collectionId: args.tableId }
    )

    return { tableId: collectionId, ...outcome }
  },
})

/** The data-dependent column rules the pure evolution check cannot see:
 *  a column may only become required while every row already holds a value
 *  for it, and removed columns hand back their ids so the scrub deletes
 *  their values from every row. Exported for its tests. */
export async function planColumnChange(
  ctx: MutationCtx,
  args: {
    organizationId: string
    tableId: Id<"collections">
    personId: Id<"persons">
    columns: unknown
  }
) {
  const table = await getAccessibleTable(ctx, args)
  const current = readStoredColumns(table.columns)
  const next = normalizeTableColumns(args.columns)
  const requiredBefore = new Set(
    current
      .filter((column) => column.required === true)
      .map((column) => column.id)
  )

  await assertRowsFilled(
    ctx,
    table,
    next.filter(
      (column) => column.required === true && !requiredBefore.has(column.id)
    )
  )

  const kept = new Set(next.map((column) => column.id))

  return {
    next,
    removed: current
      .filter((column) => !kept.has(column.id))
      .map((column) => column.id),
  }
}

/** Toggling required on is checked against every row, so the toggle is
 *  refused past a row-count cap rather than risking transaction limits. */
const requiredScanLimit = 1000

async function assertRowsFilled(
  ctx: MutationCtx,
  table: CollectionDoc<"table">,
  columns: TableColumn[]
) {
  if (columns.length === 0) {
    return
  }

  if ((table.documentCount ?? 0) > requiredScanLimit) {
    throw new Error(
      `Required can only be toggled on tables of up to ${requiredScanLimit} rows.`
    )
  }

  const rows = ctx.db
    .query("documents")
    .withIndex("by_collection", (index) => index.eq("collectionId", table._id))

  for await (const row of rows) {
    for (const column of columns) {
      if (!isRecord(row.value) || row.value[column.id] === undefined) {
        throw new Error(
          `Every row needs a value for ${column.name} before it can be required.`
        )
      }
    }
  }
}

/** Deleting a column removes its values from every row: this sweep strips
 *  the deleted ids batch by batch, rescheduling itself until the table is
 *  clean, so a removal never outgrows one transaction. */
const scrubBatchSize = 200

export const scrub = internalMutation({
  args: {
    tableId: v.id("collections"),
    columnIds: v.array(v.string()),
    after: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const after = await scrubBatch(ctx, args)

    if (after !== null) {
      await ctx.scheduler.runAfter(0, internal.tables.records.scrub, {
        ...args,
        after,
      })
    }

    return null
  },
})

/** Scrubs one keyset batch; returns the next batch's bound, or null when
 *  the sweep is complete. */
export async function scrubBatch(
  ctx: MutationCtx,
  args: {
    tableId: Id<"collections">
    columnIds: string[]
    after?: number
  }
): Promise<number | null> {
  const rows = await ctx.db
    .query("documents")
    .withIndex("by_collection", (index) => {
      const scope = index.eq("collectionId", args.tableId)

      return args.after === undefined
        ? scope
        : scope.gt("_creationTime", args.after)
    })
    .take(scrubBatchSize)

  for (const row of rows) {
    const scrubbed = withoutColumns(row.value, args.columnIds)

    if (scrubbed !== null) {
      await ctx.db.patch(row._id, { value: scrubbed, updatedAt: Date.now() })
    }
  }

  const last = rows[rows.length - 1]

  return rows.length < scrubBatchSize || last === undefined
    ? null
    : last._creationTime
}

/** The row value without the scrubbed columns, or null when nothing in it
 *  needs scrubbing. */
function withoutColumns(value: Doc<"documents">["value"], columnIds: string[]) {
  if (!isRecord(value) || !columnIds.some((columnId) => columnId in value)) {
    return null
  }

  const drop = new Set(columnIds)

  return Object.fromEntries(
    Object.entries(value).filter(([field]) => !drop.has(field))
  )
}
