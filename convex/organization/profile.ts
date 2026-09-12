import { v } from "convex/values"
import { isValidTimezone, utcTimezone } from "../../contracts/timezone"
import { parseWebsiteAddress } from "../../contracts/website"
import { type Doc } from "../_generated/dataModel"
import {
  internalMutation,
  type MutationCtx,
  mutation,
  query,
} from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { readUserProfile } from "../access/users"
import { ensureCurrentPerson } from "../persons/account"
import { assertWorkspaceAvailable } from "../retention/access"
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
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    return await readProfile(ctx, args.organizationId)
  },
})

export const approve = mutation({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const personId = await ensureCurrentPerson(ctx, args.organizationId)
    const profile = await readProfile(ctx, args.organizationId)

    if (profile === null || profile.proposed === undefined) {
      throw new Error("There is no proposed update to approve.")
    }

    const now = Date.now()
    await ctx.db.patch(profile._id, {
      ...derivedFacts(profile.proposed),
      proposed: undefined,
      approvedAt: now,
      approvedBy: createPersonActor(personId, readUserProfile(identity)),
      updatedAt: now,
    })

    if (profile.proposed.sources !== undefined) {
      await replaceApprovedSources(
        ctx,
        args.organizationId,
        profile.proposed.sources
      )
    }
  },
})

export const dismiss = mutation({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    const profile = await readProfile(ctx, args.organizationId)

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
  args: { organizationId: v.string(), domain: v.string() },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    const address = parseWebsiteAddress(args.domain)

    if (address === null) {
      throw new Error("domain must target a public website")
    }

    await writeDeclared(ctx, args.organizationId, (declared) => ({
      domains: unique([...(declared?.domains ?? []), address.key]),
    }))
  },
})

export const retractDomain = mutation({
  args: { organizationId: v.string(), domain: v.string() },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    await writeDeclared(ctx, args.organizationId, (declared) => ({
      domains: (declared?.domains ?? []).filter(
        (entry) => entry !== args.domain
      ),
    }))
  },
})

/** The organization's own day. Every usage date is bucketed in this zone, so
 *  moving it re-dates history — onboarding sets it once, and a later change
 *  will have to rebuild the rollup. */
export const declareTimezone = mutation({
  args: { organizationId: v.string(), timezone: v.string() },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    if (!isValidTimezone(args.timezone)) {
      throw new Error("timezone must be a valid IANA time zone")
    }

    await writeDeclared(ctx, args.organizationId, () => ({
      timezone: args.timezone,
    }))
  },
})

export async function readOrganizationTimezone(
  ctx: QueryLikeCtx,
  organizationId: string
) {
  const profile = await readProfile(ctx, organizationId)

  return profile?.declared?.timezone ?? utcTimezone
}

type Declared = Doc<"organizationProfile">["declared"]

/** Each declared field is stated on its own, so a write merges rather than
 *  replaces; the object itself exists only while something is declared. */
async function writeDeclared(
  ctx: MutationCtx,
  organizationId: string,
  change: (current: Declared) => { domains?: string[]; timezone?: string }
) {
  const profile = await readProfile(ctx, organizationId)
  const declared = mergeDeclared(profile?.declared, change(profile?.declared))
  const updatedAt = Date.now()

  if (profile !== null) {
    await ctx.db.patch(profile._id, { declared, updatedAt })
  } else if (declared !== undefined) {
    await ctx.db.insert("organizationProfile", {
      organizationId,
      aliases: [],
      domains: [],
      declared,
      updatedAt,
    })
  }
}

function mergeDeclared(
  current: Declared,
  change: { domains?: string[]; timezone?: string }
): Declared {
  const domains = change.domains ?? current?.domains ?? []
  const timezone = change.timezone ?? current?.timezone

  return domains.length === 0 && timezone === undefined
    ? undefined
    : { domains, timezone }
}

export const propose = internalMutation({
  args: {
    organizationId: v.string(),
    facts: organizationFacts,
    sources: v.array(organizationSourceSnapshot),
    website: v.string(),
  },
  handler: async (ctx, args) => {
    await assertWorkspaceAvailable(ctx, args.organizationId)
    const profile = await readProfile(ctx, args.organizationId)
    const approvedSources = await readApprovedSources(ctx, args.organizationId)

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
      organizationId: args.organizationId,
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
    organizationId: string
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
      organizationId: input.organizationId,
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
  organizationId: string
): Promise<OrganizationFacts | null> {
  const profile = await readProfile(ctx, organizationId)

  return profile === null ? null : approvedFacts(profile)
}

async function readProfile(ctx: QueryLikeCtx, organizationId: string) {
  return await ctx.db
    .query("organizationProfile")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .unique()
}
