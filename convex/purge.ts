import { v } from "convex/values"
import { internal } from "./_generated/api"
import { type Id } from "./_generated/dataModel"
import { internalMutation, type MutationCtx } from "./_generated/server"

/**
 * One-shot purge of legacy generated-apps data.
 *
 * Run once per environment after deploying the apps removal, then delete
 * this module in a follow-up commit once both environments are purged:
 *
 *   node --experimental-strip-types scripts/env/index.ts --env dev \
 *     -- npx convex run purge:start
 *   node --experimental-strip-types scripts/env/index.ts --env prod \
 *     -- npx convex run purge:start
 *
 * Deploy ordering: Convex validates declared-table documents against the
 * schema at push time, so an automations or runs document still carrying an
 * `appId` field would reject the very deploy that ships this code. The
 * remediation for that is pre-deploy: clear the offending fields or
 * documents from the dashboard, deploy, then run this purge. The
 * appId-stripping pass below cannot help there — it only runs after a
 * successful deploy — so it is belt-and-braces for documents the old code
 * wrote between schema validation and deploy activation.
 *
 * The legacy tables are no longer declared in the schema, so this module
 * reaches them through untyped db access; the casts stay contained here.
 */

/** Legacy tables in deletion order; none are declared in the schema. */
export const legacyTables = [
  "apps",
  "appVersions",
  "appTrees",
  "appEntries",
  "appBlobs",
  "appTools",
  "appSessions",
  "appShares",
  "appAssets",
  "appState",
  "appCaches",
  "assets",
] as const

/** Rows in these tables own a `_storage` blob that must die with them. */
const storageTables = new Set<string>(["appBlobs", "appAssets", "assets"])

/** Declared tables whose documents may still carry a stray appId field. */
const stripTables = ["automations", "runs"] as const

const batchLimit = 100

export const start = internalMutation({
  args: {
    phase: v.optional(v.number()),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const phase = args.phase ?? 0
    const next =
      phase < legacyTables.length
        ? await purgeLegacyBatch(ctx, phase)
        : await stripBatch(ctx, phase, args.cursor ?? null)

    if (next !== null) {
      await ctx.scheduler.runAfter(0, internal.purge.start, next)
    }

    return null
  },
})

type NextStep = { phase: number; cursor: string | null } | null

/** Deletes one batch from the current legacy table, blobs included. */
export async function purgeLegacyBatch(
  ctx: MutationCtx,
  phase: number
): Promise<NextStep> {
  const table = legacyTables[phase]
  const rows = await looseDb(ctx).query(table).take(batchLimit)

  for (const row of rows) {
    if (storageTables.has(table) && typeof row.storageId === "string") {
      await deleteBlob(ctx, row.storageId)
    }

    await looseDb(ctx).delete(row._id)
  }

  return rows.length === batchLimit
    ? { phase, cursor: null }
    : { phase: phase + 1, cursor: null }
}

/** Strips stray appId fields from one page of a declared table. */
export async function stripBatch(
  ctx: MutationCtx,
  phase: number,
  cursor: string | null
): Promise<NextStep> {
  const table = stripTables[phase - legacyTables.length]

  if (table === undefined) {
    return null
  }

  const page = await ctx.db
    .query(table)
    .paginate({ numItems: batchLimit, cursor })

  for (const doc of page.page) {
    if ("appId" in doc) {
      await looseDb(ctx).patch(doc._id, { appId: undefined })
    }
  }

  return page.isDone
    ? { phase: phase + 1, cursor: null }
    : { phase, cursor: page.continueCursor }
}

async function deleteBlob(ctx: MutationCtx, storageId: string) {
  try {
    await ctx.storage.delete(storageId as Id<"_storage">)
  } catch {
    // The blob may already be gone; the row must still go.
  }
}

type LegacyRow = { _id: string; storageId?: unknown }

type LooseDb = {
  delete(id: string): Promise<void>
  patch(id: string, value: Record<string, unknown>): Promise<void>
  query(table: string): { take(count: number): Promise<LegacyRow[]> }
}

/** Untyped database access for tables the schema no longer declares. */
function looseDb(ctx: MutationCtx): LooseDb {
  return ctx.db as unknown as LooseDb
}
