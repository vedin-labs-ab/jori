import { v } from "convex/values"
import { internal } from "../_generated/api"
import { action } from "../_generated/server"
import { requireTenantAccess } from "./access"
import { readVerifiedClerkEmails } from "./clerkProfile"
import {
  readClerkUserEmail,
  readClerkUserName,
  requireClerkUserId,
} from "./users"

export const syncCurrentUser = action({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args): Promise<{ synced: number }> => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const userId = requireClerkUserId(identity)
    const profile = await fetchClerkUser(userId)
    const emails = readVerifiedClerkEmails(profile)

    const result: { synced: number } = await ctx.runMutation(
      internal.persons.clerk.sync,
      {
        tenantId: args.tenantId,
        clerkSubject: userId,
        email: readClerkUserEmail(identity),
        name: readClerkUserName(identity),
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
