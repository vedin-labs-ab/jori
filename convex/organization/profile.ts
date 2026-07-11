import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import {
  internalMutation,
  type MutationCtx,
  mutation,
  query,
} from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import { readClerkUserEmail, readClerkUserName } from "../identity/users"
import { ensureCurrentPerson } from "../persons/clerk"
import { createPersonActor } from "../shared/actor"
import { type QueryLikeCtx } from "../shared/context"
import { factsEqual, type OrganizationFacts } from "./facts"
import { organizationFacts, organizationSourceSnapshot } from "./schema"
import {
  readApprovedSources,
  replaceApprovedSources,
  type SourceSnapshot,
  sourcesEqual,
} from "./sources"

export const get = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    return await readProfile(ctx, args.tenantId)
  },
})

export const approve = mutation({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const personId = await ensureCurrentPerson(ctx, args.tenantId)
    const profile = await readProfile(ctx, args.tenantId)

    if (profile === null || profile.proposed === undefined) {
      throw new Error("There is no proposed update to approve.")
    }

    const now = Date.now()
    await ctx.db.patch(profile._id, {
      ...toFacts(profile.proposed),
      proposed: undefined,
      approvedAt: now,
      approvedBy: createPersonActor(personId, {
        email: readClerkUserEmail(identity),
        name: readClerkUserName(identity),
      }),
      updatedAt: now,
    })

    if (profile.proposed.sources !== undefined) {
      await replaceApprovedSources(ctx, args.tenantId, profile.proposed.sources)
    }
  },
})

export const dismiss = mutation({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)
    const profile = await readProfile(ctx, args.tenantId)

    if (profile === null || profile.proposed === undefined) {
      throw new Error("There is no proposed update to discard.")
    }

    await ctx.db.patch(profile._id, {
      proposed: undefined,
      updatedAt: Date.now(),
    })
  },
})

export const propose = internalMutation({
  args: {
    tenantId: v.string(),
    facts: organizationFacts,
    sources: v.array(organizationSourceSnapshot),
    website: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await readProfile(ctx, args.tenantId)
    const approvedSources = await readApprovedSources(ctx, args.tenantId)

    if (
      profile !== null &&
      factsEqual(toFacts(profile), args.facts) &&
      sourcesEqual(approvedSources, args.sources) &&
      websitesEqual(readPrimaryWebsite(approvedSources), args.website)
    ) {
      if (profile.proposed !== undefined) {
        await ctx.db.patch(profile._id, { proposed: undefined })
      }

      return
    }

    await writeProposed(ctx, profile, {
      facts: args.facts,
      sources: args.sources,
      tenantId: args.tenantId,
      website: args.website,
    })
  },
})

async function writeProposed(
  ctx: MutationCtx,
  profile: Doc<"organizationProfile"> | null,
  input: {
    facts: OrganizationFacts
    sources: SourceSnapshot[]
    tenantId: string
    website: string
  }
) {
  const proposed = {
    ...input.facts,
    generatedAt: Date.now(),
    sources: input.sources,
    website: input.website,
  }

  if (profile === null) {
    await ctx.db.insert("organizationProfile", {
      tenantId: input.tenantId,
      aliases: [],
      domains: [],
      proposed,
      updatedAt: Date.now(),
    })

    return
  }

  await ctx.db.patch(profile._id, { proposed, updatedAt: Date.now() })
}

function toFacts(source: OrganizationFacts): OrganizationFacts {
  return {
    name: source.name,
    aliases: source.aliases,
    domains: source.domains,
    summary: source.summary,
  }
}

function readPrimaryWebsite(sources: SourceSnapshot[]) {
  return sources.find((source) => source.primary)?.url
}

function websitesEqual(left: string | undefined, right: string) {
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

export async function readApprovedFacts(
  ctx: QueryLikeCtx,
  tenantId: string
): Promise<OrganizationFacts | null> {
  const profile = await readProfile(ctx, tenantId)

  return profile === null ? null : toFacts(profile)
}

async function readProfile(ctx: QueryLikeCtx, tenantId: string) {
  return await ctx.db
    .query("organizationProfile")
    .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
    .unique()
}
