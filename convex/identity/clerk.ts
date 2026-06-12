import { v } from "convex/values"
import { internal } from "../_generated/api"
import { action } from "../_generated/server"
import { readVerifiedClerkEmails } from "./clerk/profile"
import { readClerkOrganizationId, requireClerkUserId } from "./users"

export const syncCurrentUser = action({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args): Promise<{ synced: number }> => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new Error("Unauthorized")
    }

    const userId = requireClerkUserId(identity)
    const identityTenantId = readClerkOrganizationId(identity)

    if (identityTenantId === undefined) {
      throw new Error("Missing active Clerk organization")
    }

    if (identityTenantId !== args.tenantId) {
      throw new Error("Active Clerk organization does not match tenant")
    }

    const profile = await fetchClerkUser(userId)
    const emails = readVerifiedClerkEmails(profile)

    const result: { synced: number } = await ctx.runMutation(
      internal.identity.clerk.data.syncVerifiedEmails,
      {
        tenantId: args.tenantId,
        userId,
        emails,
      }
    )

    return result
  },
})

async function fetchClerkUser(userId: string) {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY

  if (clerkSecretKey === undefined) {
    throw new Error("Missing CLERK_SECRET_KEY")
  }

  const response = await fetch(
    `https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`,
    {
      headers: {
        authorization: `Bearer ${clerkSecretKey}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error("Could not fetch Clerk user")
  }

  return await response.json()
}
