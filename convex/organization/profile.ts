import { v } from "convex/values"
import { parseWebsiteAddress } from "../../contracts/website"
import { type Doc } from "../_generated/dataModel"
import {
  internalMutation,
  type MutationCtx,
  mutation,
  query,
} from "../_generated/server"
import { requireTenantAccess } from "../access"
import { readClerkUserEmail, readClerkUserName } from "../access/users"
import { ensureCurrentPerson } from "../persons/clerk"
import { createPersonActor } from "../shared/actor"
import { type QueryLikeCtx } from "../shared/context"
import { factsEqual, type OrganizationFacts, unique } from "./facts"
import { organizationFacts, organizationSourceSnapshot } from "./schema"
import {
  readApprovedSources,
  readPrimaryWebsite,
  replaceApprovedSources,
  type SourceSnapshot,
  sourcesEqual,
  websitesEqual,
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
      ...derivedFacts(profile.proposed),
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

export const declareDomain = mutation({
  args: { tenantId: v.string(), domain: v.string() },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)
    const address = parseWebsiteAddress(args.domain)

    if (address === null) {
      throw new Error("domain must target a public website")
    }

    const domain = address.key

    const profile = await readProfile(ctx, args.tenantId)
    const domains = unique([...(profile?.declared?.domains ?? []), domain])

    if (profile === null) {
      await ctx.db.insert("organizationProfile", {
        tenantId: args.tenantId,
        aliases: [],
        domains: [],
        declared: { domains },
        updatedAt: Date.now(),
      })

      return
    }

    await ctx.db.patch(profile._id, {
      declared: { domains },
      updatedAt: Date.now(),
    })
  },
})

export const retractDomain = mutation({
  args: { tenantId: v.string(), domain: v.string() },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)
    const profile = await readProfile(ctx, args.tenantId)
    const declared = profile?.declared?.domains ?? []
    const domains = declared.filter((entry) => entry !== args.domain)

    if (profile === null || domains.length === declared.length) {
      return
    }

    await ctx.db.patch(profile._id, {
      declared: domains.length === 0 ? undefined : { domains },
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
      factsEqual(derivedFacts(profile), args.facts) &&
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

// The pipeline-owned facts: live columns written by approval and compared by
// the watcher. Must stay blind to `declared` — polluting this would make
// `propose` see a perpetual diff and re-draft forever.
export function derivedFacts(source: OrganizationFacts): OrganizationFacts {
  return {
    name: source.name,
    aliases: source.aliases,
    domains: source.domains,
    summary: source.summary,
  }
}

// What the rest of the product should treat as true: derived facts plus the
// user's declared domains. The union lives only here, at the consumer edge,
// so discovery, drafting, and approval never see declared values.
export function approvedFacts(
  profile: Doc<"organizationProfile">
): OrganizationFacts {
  const facts = derivedFacts(profile)

  return {
    ...facts,
    domains: unique([...facts.domains, ...(profile.declared?.domains ?? [])]),
  }
}

export async function readApprovedFacts(
  ctx: QueryLikeCtx,
  tenantId: string
): Promise<OrganizationFacts | null> {
  const profile = await readProfile(ctx, tenantId)

  return profile === null ? null : approvedFacts(profile)
}

async function readProfile(ctx: QueryLikeCtx, tenantId: string) {
  return await ctx.db
    .query("organizationProfile")
    .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
    .unique()
}
