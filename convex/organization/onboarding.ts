import { v } from "convex/values"
import { normalizeWebsiteAddress } from "../../contracts/website"
import { internal } from "../_generated/api"
import { type ActionCtx, action } from "../_generated/server"
import { requireTenantAccess } from "../identity/access"

// Marks onboarding as seen (so the welcome flow never reopens) and, when a
// website is provided, kicks off discovery for a proposed organization profile.
export const complete = action({
  args: { tenantId: v.string(), website: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)
    const website = normalizeWebsite(args.website)
    await patchClerkMetadata(args.tenantId, { onboarded: true })

    if (website !== undefined) {
      await startDiscovery(ctx, args.tenantId, website)
    }
  },
})

// Re-runs discovery from the context page, optionally updating the website.
export const discover = action({
  args: { tenantId: v.string(), website: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)
    const website = normalizeWebsite(args.website)
    await startDiscovery(ctx, args.tenantId, website)
  },
})

async function startDiscovery(
  ctx: ActionCtx,
  tenantId: string,
  website: string | undefined
) {
  const primaryUrl =
    website ??
    (await ctx.runQuery(internal.organization.sources.primaryUrl, { tenantId }))

  if (primaryUrl === null || primaryUrl === undefined) {
    throw new Error("Add a website before running discovery.")
  }

  await ctx.scheduler.runAfter(0, internal.organization.draft.run, {
    tenantId,
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
  tenantId: string,
  metadata: { onboarded?: boolean }
) {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY

  if (clerkSecretKey === undefined) {
    throw new Error("Missing CLERK_SECRET_KEY")
  }

  const response = await fetch(
    `https://api.clerk.com/v1/organizations/${tenantId}/metadata`,
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
