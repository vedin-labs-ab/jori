import { ConvexError, type GenericId, v } from "convex/values"

import { type DataModel } from "./_generated/dataModel"
import { internalMutation, type MutationCtx } from "./_generated/server"

type TableName = keyof DataModel

const tableRegistry: Record<TableName, true> = {
  skills: true,
  attachments: true,
  identities: true,
  integrations: true,
  messages: true,
  automations: true,
  subscriptions: true,
  events: true,
  runs: true,
  watches: true,
  sessions: true,
  approvals: true,
  traces: true,
  outbox: true,
  sandboxes: true,
  permissions: true,
  artifacts: true,
  artifactVersions: true,
  artifactTrees: true,
  artifactEntries: true,
  artifactBlobs: true,
  artifactTools: true,
  artifactSessions: true,
  artifactAssets: true,
  artifactState: true,
  artifactCaches: true,
}

const tables = Object.keys(tableRegistry) as TableName[]
const defaultBatchLimit = 256
const maxBatchLimit = 1024

type TruncateResult = {
  deletedCount: number
  deletedByTable: Array<{
    table: TableName
    count: number
  }>
  hasMore: boolean
}

export const databaseBatch = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.object({
    deletedCount: v.number(),
    deletedByTable: v.array(
      v.object({
        table: v.string(),
        count: v.number(),
      })
    ),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args): Promise<TruncateResult> => {
    const limit = normalizeBatchLimit(args.limit)
    const deletedByTable: TruncateResult["deletedByTable"] = []
    let remainingBudget = limit

    for (const table of tables) {
      if (remainingBudget === 0) {
        break
      }

      const rows = await takeRows(ctx, table, remainingBudget)

      if (rows.length === 0) {
        continue
      }

      for (const row of rows) {
        await ctx.db.delete(row._id as never)
      }

      deletedByTable.push({
        table,
        count: rows.length,
      })
      remainingBudget -= rows.length
    }

    return {
      deletedCount: limit - remainingBudget,
      deletedByTable,
      hasMore: await hasRemainingRows(ctx),
    }
  },
})

function normalizeBatchLimit(value?: number) {
  if (value === undefined) {
    return defaultBatchLimit
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new ConvexError("Batch limit must be a positive integer")
  }

  return Math.min(value, maxBatchLimit)
}

async function takeRows(ctx: MutationCtx, table: TableName, limit: number) {
  return (await ctx.db.query(table).take(limit)) as Array<{
    _id: GenericId<string>
  }>
}

async function hasRemainingRows(ctx: MutationCtx) {
  for (const table of tables) {
    const rows = await takeRows(ctx, table, 1)

    if (rows.length > 0) {
      return true
    }
  }

  return false
}
