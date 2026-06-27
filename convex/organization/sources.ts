import { type Infer, v } from "convex/values"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
  query,
} from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import { type organizationSourceSnapshot } from "./schema"

export type SourceSnapshot = Infer<typeof organizationSourceSnapshot>

const dayMs = 24 * 60 * 60 * 1000
const processedIntervalMs = 14 * dayMs
const maxSourcesPerTenant = 50

// Registers (or refreshes) the entrypoint URL the crawler starts from and marks
// it due immediately so the next discovery run picks it up.
export const seed = internalMutation({
  args: { tenantId: v.string(), url: v.string() },
  handler: async (ctx, args) => {
    await demoteOtherPrimaries(ctx, args.tenantId, args.url)
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
    if (args.primary) {
      await demoteOtherPrimaries(ctx, args.tenantId, args.url)
    }

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

export async function replaceApprovedSources(
  ctx: MutationCtx,
  tenantId: string,
  sources: SourceSnapshot[]
) {
  const existing = await readByTenant(ctx, tenantId)

  for (const source of existing) {
    await ctx.db.delete(source._id)
  }

  const checkAt = Date.now() + processedIntervalMs

  for (const source of uniqueSnapshots(sources).slice(0, maxSourcesPerTenant)) {
    await ctx.db.insert("organizationSources", {
      tenantId,
      url: source.url,
      primary: source.primary,
      checkAt,
      ...(source.hash === undefined ? {} : { hash: source.hash }),
    })
  }
}

export async function readApprovedSources(
  ctx: QueryCtx | MutationCtx,
  tenantId: string
): Promise<SourceSnapshot[]> {
  return (await readByTenant(ctx, tenantId)).map(toSnapshot)
}

export function sourcesEqual(left: SourceSnapshot[], right: SourceSnapshot[]) {
  return serializeSnapshots(left) === serializeSnapshots(right)
}

export const primaryUrl = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const sources = await readByTenant(ctx, args.tenantId)

    return sources.find((source) => source.primary)?.url ?? null
  },
})

export const list = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const sources = await readByTenant(ctx, args.tenantId)

    return sources
      .map((source) => ({ primary: source.primary, url: source.url }))
      .sort(compareSources)
  },
})

function compareSources(
  left: { primary: boolean; url: string },
  right: { primary: boolean; url: string }
) {
  if (left.primary !== right.primary) {
    return left.primary ? -1 : 1
  }

  return left.url.localeCompare(right.url)
}

async function demoteOtherPrimaries(
  ctx: MutationCtx,
  tenantId: string,
  primaryUrl: string
) {
  const sources = await readByTenant(ctx, tenantId)

  for (const source of sources) {
    if (source.primary && source.url !== primaryUrl) {
      await ctx.db.patch(source._id, { primary: false })
    }
  }
}

async function readByTenant(ctx: QueryCtx | MutationCtx, tenantId: string) {
  return await ctx.db
    .query("organizationSources")
    .withIndex("by_tenant_and_url", (q) => q.eq("tenantId", tenantId))
    .take(maxSourcesPerTenant)
}

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

function toSnapshot(source: {
  hash?: string
  primary: boolean
  url: string
}): SourceSnapshot {
  return {
    url: source.url,
    primary: source.primary,
    ...(source.hash === undefined ? {} : { hash: source.hash }),
  }
}

function uniqueSnapshots(sources: SourceSnapshot[]) {
  const byUrl = new Map<string, SourceSnapshot>()

  for (const source of sources) {
    const key = normalizeUrl(source.url)
    const existing = byUrl.get(key)
    const hash = source.hash ?? existing?.hash

    byUrl.set(key, {
      url: source.url,
      primary: source.primary || existing?.primary === true,
      ...(hash === undefined ? {} : { hash }),
    })
  }

  return [...byUrl.values()]
}

function serializeSnapshots(sources: SourceSnapshot[]) {
  return JSON.stringify(
    uniqueSnapshots(sources)
      .map((source) => ({
        hash: source.hash ?? null,
        primary: source.primary,
        url: normalizeUrl(source.url),
      }))
      .sort((left, right) => left.url.localeCompare(right.url))
  )
}

function normalizeUrl(url: string) {
  return url.trim().toLowerCase()
}
