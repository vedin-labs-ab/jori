import { v } from "convex/values"
import { normalizeWebsiteAddress } from "../../contracts/website"
import { components, internal } from "../_generated/api"
import { type ActionCtx, action, internalMutation } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { authComponent, createAuth } from "../auth"
import { optionalString } from "../shared/input"
import { readDiscovery } from "./discovery"

// Marks the organization as onboarded, which opens the console to it.
export const complete = action({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    await markOnboarded(ctx, args.organizationId)
  },
})

/** Development only, run through `pnpm db:onboarding`: puts one organization,
 *  or every organization when none is named, back before its onboarding so
 *  the flow can be walked again. */
export const reset = internalMutation({
  args: { organizationId: v.optional(v.string()) },
  handler: async (ctx, { organizationId }) => {
    await ctx.runMutation(components.betterAuth.adapter.updateMany, {
      input: {
        model: "organization",
        update: { metadata: null },
        where:
          organizationId === undefined
            ? []
            : [{ field: "_id", value: organizationId }],
      },
      paginationOpts: { cursor: null, numItems: 100 },
    })

    const discoveries =
      organizationId === undefined
        ? await ctx.db.query("organizationDiscovery").collect()
        : [await readDiscovery(ctx, organizationId)]

    for (const discovery of discoveries) {
      if (discovery !== null) {
        await ctx.db.delete(discovery._id)
      }
    }
  },
})

// Starts discovery from onboarding or the context page, optionally updating
// the website.
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
