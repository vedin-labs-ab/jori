import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import { factsEqual, type OrganizationFacts } from "./facts"
import { organizationFacts } from "./schema"

export const get = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    return await readProfile(ctx, args.tenantId)
  },
})

export const read = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => await readProfile(ctx, args.tenantId),
})

export const approve = mutation({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)
    const profile = await readProfile(ctx, args.tenantId)

    if (profile === null || profile.proposed === undefined) {
      throw new Error("There is no proposed update to approve.")
    }

    const now = Date.now()
    await ctx.db.patch(profile._id, {
      ...toFacts(profile.proposed),
      proposed: undefined,
      approvedAt: now,
      updatedAt: now,
    })
  },
})

export const propose = internalMutation({
  args: { tenantId: v.string(), facts: organizationFacts },
  handler: async (ctx, args) => {
    const profile = await readProfile(ctx, args.tenantId)

    if (profile !== null && factsEqual(toFacts(profile), args.facts)) {
      if (profile.proposed !== undefined) {
        await ctx.db.patch(profile._id, { proposed: undefined })
      }

      return
    }

    await writeProposed(ctx, profile, args.tenantId, args.facts)
  },
})

async function writeProposed(
  ctx: MutationCtx,
  profile: Doc<"organizationProfile"> | null,
  tenantId: string,
  facts: OrganizationFacts
) {
  const proposed = { ...facts, generatedAt: Date.now() }

  if (profile === null) {
    await ctx.db.insert("organizationProfile", {
      tenantId,
      aliases: [],
      domains: [],
      products: [],
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
    products: source.products,
    summary: source.summary,
  }
}

export async function readApprovedFacts(
  ctx: QueryCtx | MutationCtx,
  tenantId: string
): Promise<OrganizationFacts | null> {
  const profile = await readProfile(ctx, tenantId)

  return profile === null ? null : toFacts(profile)
}

async function readProfile(ctx: QueryCtx | MutationCtx, tenantId: string) {
  return await ctx.db
    .query("organizationProfile")
    .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
    .unique()
}
