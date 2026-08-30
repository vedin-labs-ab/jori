import { v } from "convex/values"
import { readStoredColumns } from "../../contracts/tables/columns"
import { internal } from "../_generated/api"
import { internalMutation, type MutationCtx } from "../_generated/server"

/**
 * TEMPORARY one-shot migration: stamps every stored table column's hidden
 * `id` from its legacy `key` — the pre-rename identifier rows already key
 * their values by, so row documents need no rewrite at all.
 *
 * Run once per environment after deploying, then delete this module in a
 * follow-up commit — along with StoredTableColumn/readStoredColumns in
 * contracts/tables/columns.ts — and tighten the column validator in
 * convex/collections/schema.ts (id required, key gone):
 *
 *   node --experimental-strip-types scripts/env/index.ts --env dev \
 *     -- npx convex run tables/migrate:start
 *   node --experimental-strip-types scripts/env/index.ts --env prod \
 *     -- npx convex run tables/migrate:start
 *
 * Each invocation sweeps one keyset batch of the collections table (the
 * built-in by_creation_time index orders the keyset) and reschedules
 * itself until a batch comes up short.
 */
const migrateBatchSize = 100

export const start = internalMutation({
  args: { after: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const next = await migrateStep(ctx, args.after)

    if (next !== null) {
      await ctx.scheduler.runAfter(0, internal.tables.migrate.start, {
        after: next,
      })
    }

    return null
  },
})

/** Stamps one batch; returns the next step's keyset bound, or null when
 *  the sweep is complete. */
export async function migrateStep(
  ctx: MutationCtx,
  after: number | undefined
): Promise<number | null> {
  const collections = await ctx.db
    .query("collections")
    .withIndex("by_creation_time", (index) =>
      after === undefined ? index : index.gt("_creationTime", after)
    )
    .take(migrateBatchSize)

  for (const collection of collections) {
    if (
      collection.kind === "table" &&
      collection.columns.some((column) => column.id === undefined)
    ) {
      await ctx.db.patch(collection._id, {
        columns: readStoredColumns(collection.columns),
      })
    }
  }

  const last = collections[collections.length - 1]

  return collections.length < migrateBatchSize || last === undefined
    ? null
    : last._creationTime
}
