import { type Infer, v } from "convex/values"
import { compactRecord } from "../../contracts/json"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  query,
} from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { type QueryLikeCtx } from "../shared/context"
import { organizationSourceSnapshot } from "./schema"

export type SourceSnapshot = Infer<typeof organizationSourceSnapshot>

const dayMs = 24 * 60 * 60 * 1000
const processedIntervalMs = 14 * dayMs
const maxSourcesPerOrganization = 50

// Records the fingerprints of the pages a draft just processed, so the watcher
// only re-triggers on content the pipeline has not seen yet. Patches known
// pages, registers newly crawled ones up to the organization cap, moves the primary
// flag to the draft's entrypoint, and relaxes each next check by two weeks.
export const baseline = internalMutation({
  args: {
    organizationId: v.string(),
    sources: v.array(organizationSourceSnapshot),
  },
  handler: async (ctx, args) => {
    const existing = await readByOrganization(ctx, args.organizationId)
    const pages = uniqueSnapshots(args.sources).filter(hasHash)
    const primaryUrl = pages.find((page) => page.primary)?.url
    const checkAt = Date.now() + processedIntervalMs
    let capacity = maxSourcesPerOrganization - existing.length

    for (const row of existing) {
      if (primaryUrl !== undefined && row.primary && row.url !== primaryUrl) {
        await ctx.db.patch(row._id, { primary: false })
      }
    }

    for (const page of pages) {
      const row = existing.find((entry) => entry.url === page.url)

      if (row !== undefined) {
        await ctx.db.patch(row._id, {
          hash: page.hash,
          checkAt,
          primary: page.primary,
          ...(row.hash === page.hash ? {} : { changedAt: Date.now() }),
        })

        continue
      }

      if (capacity > 0) {
        capacity -= 1
        await ctx.db.insert("organizationSources", {
          organizationId: args.organizationId,
          url: page.url,
          primary: page.primary,
          hash: page.hash,
          checkAt,
        })
      }
    }
  },
})

export async function replaceApprovedSources(
  ctx: MutationCtx,
  organizationId: string,
  sources: SourceSnapshot[]
) {
  const existing = await readByOrganization(ctx, organizationId)

  for (const source of existing) {
    await ctx.db.delete(source._id)
  }

  const checkAt = Date.now() + processedIntervalMs

  for (const source of uniqueSnapshots(sources).slice(
    0,
    maxSourcesPerOrganization
  )) {
    await ctx.db.insert(
      "organizationSources",
      compactRecord({
        organizationId,
        url: source.url,
        primary: source.primary,
        checkAt,
        hash: source.hash,
      })
    )
  }
}

export async function readApprovedSources(
  ctx: QueryLikeCtx,
  organizationId: string
): Promise<SourceSnapshot[]> {
  return (await readByOrganization(ctx, organizationId)).map(toSnapshot)
}

// Equality covers the reviewable identity of the source set — urls and the
// primary flag, the same view the console diff shows. Hashes are freshness
// bookkeeping, so a re-crawl that changes only fingerprints never counts as
// a proposable change.
export function sourcesEqual(left: SourceSnapshot[], right: SourceSnapshot[]) {
  return serializeSnapshots(left) === serializeSnapshots(right)
}

export const primaryUrl = internalQuery({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const sources = await readByOrganization(ctx, args.organizationId)

    return sources.find((source) => source.primary)?.url ?? null
  },
})

export const list = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    const sources = await readByOrganization(ctx, args.organizationId)

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

async function readByOrganization(ctx: QueryLikeCtx, organizationId: string) {
  return await ctx.db
    .query("organizationSources")
    .withIndex("by_organization_and_url", (q) =>
      q.eq("organizationId", organizationId)
    )
    .take(maxSourcesPerOrganization)
}

function hasHash(
  source: SourceSnapshot
): source is SourceSnapshot & { hash: string } {
  return source.hash !== undefined
}

function toSnapshot(source: {
  hash?: string
  primary: boolean
  url: string
}): SourceSnapshot {
  return compactRecord({
    url: source.url,
    primary: source.primary,
    hash: source.hash,
  })
}

function uniqueSnapshots(sources: SourceSnapshot[]) {
  const byUrl = new Map<string, SourceSnapshot>()

  for (const source of sources) {
    const key = normalizeUrl(source.url)
    const existing = byUrl.get(key)
    const hash = source.hash ?? existing?.hash

    byUrl.set(
      key,
      compactRecord({
        url: source.url,
        primary: source.primary || existing?.primary === true,
        hash,
      })
    )
  }

  return [...byUrl.values()]
}

function serializeSnapshots(sources: SourceSnapshot[]) {
  return JSON.stringify(
    uniqueSnapshots(sources)
      .map((source) => ({
        primary: source.primary,
        url: normalizeUrl(source.url),
      }))
      .sort((left, right) => left.url.localeCompare(right.url))
  )
}

function normalizeUrl(url: string) {
  return url.trim().toLowerCase()
}

export function readPrimaryWebsite(sources: SourceSnapshot[]) {
  return sources.find((source) => source.primary)?.url
}

export function websitesEqual(left: string | undefined, right: string) {
  return websiteKey(left) === websiteKey(right)
}

function websiteKey(value: string | undefined) {
  const trimmed = value?.trim()

  if (trimmed === undefined || trimmed === "") {
    return ""
  }

  try {
    const url = new URL(trimmed)
    const pathname = url.pathname.replace(/\/$/, "")

    return `${url.protocol}//${url.host.toLowerCase()}${pathname}`
  } catch {
    return trimmed.toLowerCase().replace(/\/$/, "")
  }
}
