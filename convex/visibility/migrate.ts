import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { type StoredVisibility } from "./schema"

/**
 * TEMPORARY one-shot backfill: stamps `visibility` from the legacy binary
 * `scope` on every collection, file, and automation that predates the
 * grant model — personal maps to private, organization (and unset) to
 * organization-wide — and clears the legacy field. Folders never carried a
 * scope; their unset visibility already reads as organization-wide. New
 * writes stamp `visibility` at every creation chokepoint, and readers map
 * any straggler through readVisibility meanwhile.
 *
 * Run once per environment after deploying, then delete this mutation, its
 * step helper, their tests, and the legacy `scope` fields plus
 * readVisibility's scope mapping in a follow-up commit:
 *
 *   node --experimental-strip-types scripts/env/index.ts --env dev \
 *     -- npx convex run visibility/migrate:backfill
 *   node --experimental-strip-types scripts/env/index.ts --env prod \
 *     -- npx convex run visibility/migrate:backfill
 *
 * Each invocation sweeps one keyset batch of one table (the built-in
 * by_creation_time index orders the keyset) and reschedules itself until
 * every table's sweep comes up short.
 */
const backfillBatchSize = 500

export const migratedTables = ["collections", "files", "automations"] as const

type MigratedTable = (typeof migratedTables)[number]

const migratedTable = v.union(
  v.literal("collections"),
  v.literal("files"),
  v.literal("automations")
)

export const backfill = internalMutation({
  args: {
    table: v.optional(migratedTable),
    after: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const table = args.table ?? migratedTables[0]
    const next = await backfillStep(ctx, table, args.after)

    if (next !== null) {
      await ctx.scheduler.runAfter(0, internal.visibility.migrate.backfill, {
        table,
        after: next,
      })

      return null
    }

    const following = migratedTables[migratedTables.indexOf(table) + 1]

    if (following !== undefined) {
      await ctx.scheduler.runAfter(0, internal.visibility.migrate.backfill, {
        table: following,
      })
    }

    return null
  },
})

/** Stamps one batch of one table; returns the next step's keyset bound, or
 *  null when that table's sweep is complete. */
export async function backfillStep(
  ctx: MutationCtx,
  table: MigratedTable,
  after: number | undefined
): Promise<number | null> {
  const rows = await ctx.db
    .query(table)
    .withIndex("by_creation_time", (index) =>
      after === undefined ? index : index.gt("_creationTime", after)
    )
    .take(backfillBatchSize)

  for (const row of rows) {
    if (row.visibility === undefined || row.scope !== undefined) {
      await ctx.db.patch(row._id as Id<MigratedTable>, {
        visibility: row.visibility ?? visibilityFromLegacyScope(row.scope),
        scope: undefined,
      })
    }
  }

  const last = rows[rows.length - 1]

  return rows.length < backfillBatchSize || last === undefined
    ? null
    : last._creationTime
}

function visibilityFromLegacyScope(
  scope: "personal" | "organization" | undefined
): StoredVisibility {
  return scope === "personal" ? { mode: "private" } : { mode: "organization" }
}
