import { v } from "convex/values"
import {
  assertColumnEvolution,
  normalizeTableColumns,
  type TableColumn,
} from "../../contracts/tables/columns"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import {
  normalizeMaterialDescription,
  normalizeMaterialName,
} from "../materials/input"
import { scopeValidator } from "../shared/audience"
import { getAccessibleTable, summarizeTable } from "./access"

const purgeBatchSize = 200

export const create = internalMutation({
  args: {
    organizationId: v.string(),
    personId: v.id("persons"),
    name: v.string(),
    description: v.optional(v.string()),
    scope: v.optional(scopeValidator),
    columns: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const tableId = await ctx.db.insert("tables", {
      organizationId: args.organizationId,
      ownerId: args.personId,
      scope: args.scope ?? "organization",
      name: normalizeMaterialName(args.name),
      description: normalizeMaterialDescription(args.description),
      columns: normalizeTableColumns(args.columns),
      createdAt: now,
      updatedAt: now,
    })
    const table = await ctx.db.get(tableId)

    if (table === null) {
      throw new Error("Table creation failed.")
    }

    return summarizeTable(table)
  },
})

export const update = internalMutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
    personId: v.id("persons"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    columns: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const table = await getAccessibleTable(ctx, args)

    await ctx.db.patch(table._id, {
      ...(args.name === undefined
        ? {}
        : { name: normalizeMaterialName(args.name) }),
      ...(args.description === undefined
        ? {}
        : { description: normalizeMaterialDescription(args.description) }),
      ...(args.columns === undefined
        ? {}
        : {
            columns: evolveColumns(
              table.columns as TableColumn[],
              args.columns
            ),
          }),
      updatedAt: Date.now(),
    })

    const updated = await ctx.db.get(table._id)

    return updated === null ? null : summarizeTable(updated)
  },
})

/** Archive an active table; removing an archived one deletes it and its
 *  rows permanently. */
export const remove = internalMutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    const table = await getAccessibleTable(ctx, args)

    if (table.archivedAt === undefined) {
      const now = Date.now()

      await ctx.db.patch(table._id, { archivedAt: now, updatedAt: now })

      return { tableId: table._id, archived: true as const }
    }

    await ctx.db.delete(table._id)
    await deleteRowBatch(ctx, table._id)

    return { tableId: table._id, deleted: true as const }
  },
})

export const restore = internalMutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    const table = await getAccessibleTable(ctx, args)

    await ctx.db.patch(table._id, {
      archivedAt: undefined,
      updatedAt: Date.now(),
    })

    return { tableId: table._id, restored: true as const }
  },
})

/** Deletes one batch of rows and reschedules itself while rows remain, so
 *  purging a large table never outgrows a single transaction. */
export const purgeRows = internalMutation({
  args: {
    tableId: v.id("tables"),
  },
  handler: async (ctx, args) => {
    await deleteRowBatch(ctx, args.tableId)

    return null
  },
})

/** New columns must be additions; existing ones may only change display
 *  names. This keeps every stored row valid without a migration system. */
function evolveColumns(current: TableColumn[], next: unknown) {
  const columns = normalizeTableColumns(next)

  assertColumnEvolution(current, columns)

  return columns
}

async function deleteRowBatch(ctx: MutationCtx, tableId: Id<"tables">) {
  const rows = await ctx.db
    .query("tableRows")
    .withIndex("by_table", (index) => index.eq("tableId", tableId))
    .take(purgeBatchSize)

  for (const row of rows) {
    await ctx.db.delete(row._id)
  }

  if (rows.length === purgeBatchSize) {
    await ctx.scheduler.runAfter(0, internal.tables.records.purgeRows, {
      tableId,
    })
  }
}
