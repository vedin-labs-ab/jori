import { ConvexError, type GenericId, v } from "convex/values"

import { type DataModel } from "./_generated/dataModel"
import { internalMutation, type MutationCtx } from "./_generated/server"

type TableName = keyof DataModel

const tableRegistry: Record<TableName, true> = {
  skills: true,
  allowlist: true,
  waitlist: true,
  persons: true,
  files: true,
  billingAccounts: true,
  billingEntries: true,
  identities: true,
  integrations: true,
  integrationOffers: true,
  messages: true,
  places: true,
  organizationProfile: true,
  organizationSources: true,
  organizationDiscovery: true,
  reactions: true,
  automations: true,
  playbookPreferences: true,
  subscriptions: true,
  events: true,
  backfills: true,
  runs: true,
  conversations: true,
  beliefs: true,
  efforts: true,
  evidence: true,
  journal: true,
  passes: true,
  sessions: true,
  approvals: true,
  transitions: true,
  traces: true,
  outbox: true,
  waiters: true,
  sandboxes: true,
  permissions: true,
  apps: true,
  appVersions: true,
  appTrees: true,
  appEntries: true,
  appBlobs: true,
  appTools: true,
  appSessions: true,
  appShares: true,
  appAssets: true,
  appState: true,
  appCaches: true,
  tables: true,
  tableRows: true,
  stores: true,
  storeValues: true,
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
    if (await hasRemainingTableRows(ctx, table)) {
      return true
    }
  }

  return false
}

async function hasRemainingTableRows(ctx: MutationCtx, table: TableName) {
  const rows = await takeRows(ctx, table, 1)

  return rows.length > 0
}
