import { v } from "convex/values"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server"

const dayMs = 24 * 60 * 60 * 1000
const processedIntervalMs = 14 * dayMs
const maxSourcesPerTenant = 50

// Registers (or refreshes) the entrypoint URL the crawler starts from and marks
// it due immediately so the next discovery run picks it up.
export const seed = internalMutation({
  args: { tenantId: v.string(), url: v.string() },
  handler: async (ctx, args) => {
    const existing = await readByUrl(ctx, args.tenantId, args.url)

    if (existing !== null) {
      await ctx.db.patch(existing._id, { primary: true, checkAt: Date.now() })

      return
    }

    await ctx.db.insert("organizationSources", {
      tenantId: args.tenantId,
      url: args.url,
      primary: true,
      checkAt: Date.now(),
    })
  },
})

// Records the baseline fingerprint for a page during a draft run and relaxes its
// next check by two weeks (the "processed" cadence).
export const upsert = internalMutation({
  args: {
    tenantId: v.string(),
    url: v.string(),
    hash: v.string(),
    primary: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await readByUrl(ctx, args.tenantId, args.url)
    const checkAt = Date.now() + processedIntervalMs

    if (existing === null) {
      await ctx.db.insert("organizationSources", {
        tenantId: args.tenantId,
        url: args.url,
        primary: args.primary,
        hash: args.hash,
        checkAt,
      })

      return
    }

    await ctx.db.patch(existing._id, {
      hash: args.hash,
      checkAt,
      primary: existing.primary || args.primary,
      ...(existing.hash === args.hash ? {} : { changedAt: Date.now() }),
    })
  },
})

export const primaryUrl = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const sources = await ctx.db
      .query("organizationSources")
      .withIndex("by_tenant_and_url", (q) => q.eq("tenantId", args.tenantId))
      .take(maxSourcesPerTenant)

    return sources.find((source) => source.primary)?.url ?? null
  },
})

async function readByUrl(
  ctx: QueryCtx | MutationCtx,
  tenantId: string,
  url: string
) {
  return await ctx.db
    .query("organizationSources")
    .withIndex("by_tenant_and_url", (q) =>
      q.eq("tenantId", tenantId).eq("url", url)
    )
    .unique()
}
