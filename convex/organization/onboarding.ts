import { v } from "convex/values"
import { normalizeWebsiteAddress } from "../../contracts/website"
import { internal } from "../_generated/api"
import { type ActionCtx, action } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { authComponent, createAuth } from "../auth"
import { optionalString } from "../shared/input"

// Marks onboarding as seen (so the welcome flow never reopens) and, when a
// website is provided, kicks off discovery for a proposed organization profile.
export const complete = action({
  args: { organizationId: v.string(), website: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    const website = normalizeWebsite(args.website)
    await markOnboarded(ctx, args.organizationId)

    if (website !== undefined) {
      await startDiscovery(ctx, args.organizationId, website)
    }
  },
})

// Re-runs discovery from the context page, optionally updating the website.
export const discover = action({
  args: { organizationId: v.string(), website: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    const website = normalizeWebsite(args.website)
    await startDiscovery(ctx, args.organizationId, website)
  },
})

async function startDiscovery(
  ctx: ActionCtx,
  organizationId: string,
  website: string | undefined
) {
  const primaryUrl =
    website ??
    (await ctx.runQuery(internal.organization.sources.primaryUrl, {
      organizationId,
    }))

  if (primaryUrl === null || primaryUrl === undefined) {
    throw new Error("Add a website before running discovery.")
  }

  await ctx.scheduler.runAfter(0, internal.organization.draft.run, {
    organizationId,
    primaryUrl,
  })
}

function normalizeWebsite(website: string | undefined) {
  const normalized = optionalString(website)

  if (normalized === undefined) {
    return undefined
  }

  return normalizeWebsiteAddress(normalized, "website")
}

async function markOnboarded(ctx: ActionCtx, organizationId: string) {
  const { auth, headers } = await authComponent.getAuth(createAuth, ctx)

  await auth.api.updateOrganization({
    body: { organizationId, data: { metadata: { onboarded: true } } },
    headers,
  })
}
