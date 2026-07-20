import { v } from "convex/values"
import { normalizeWebsiteAddress } from "../../contracts/website"
import { internal } from "../_generated/api"
import { type ActionCtx, action } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { requireEnvironmentVariable } from "../shared/environment"

// Marks onboarding as seen (so the welcome flow never reopens) and, when a
// website is provided, kicks off discovery for a proposed organization profile.
export const complete = action({
  args: { organizationId: v.string(), website: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    const website = normalizeWebsite(args.website)
    await patchClerkMetadata(args.organizationId, { onboarded: true })

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
  const trimmed = website?.trim()

  if (trimmed === undefined || trimmed === "") {
    return undefined
  }

  return normalizeWebsiteAddress(trimmed, "website")
}

async function patchClerkMetadata(
  organizationId: string,
  metadata: { onboarded?: boolean }
) {
  const clerkSecretKey = requireEnvironmentVariable("CLERK_SECRET_KEY")

  const response = await fetch(
    `https://api.clerk.com/v1/organizations/${organizationId}/metadata`,
    {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${clerkSecretKey}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ public_metadata: cleanMetadata(metadata) }),
    }
  )

  if (!response.ok) {
    throw new Error("Could not update the organization.")
  }
}

function cleanMetadata(metadata: { onboarded?: boolean }) {
  return {
    ...(metadata.onboarded === undefined
      ? {}
      : { onboarded: metadata.onboarded }),
  }
}
