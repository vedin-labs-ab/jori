import { v } from "convex/values"
import { internal } from "../_generated/api"
import { action } from "../_generated/server"
import { requireEnvironmentVariable } from "../shared/environment"
import { requireOrganizationAccess } from "./index"
import { readVerifiedClerkEmails } from "./profile"
import {
  readClerkUserEmail,
  readClerkUserName,
  requireClerkUserId,
} from "./users"

export const syncCurrentUser = action({
  args: {
    organizationId: v.string(),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ synced: number }> => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const userId = requireClerkUserId(identity)
    const profile = await fetchClerkUser(userId)
    const emails = readVerifiedClerkEmails(profile)

    const result: { synced: number } = await ctx.runMutation(
      internal.persons.clerk.sync,
      {
        organizationId: args.organizationId,
        clerkSubject: userId,
        email: readClerkUserEmail(identity),
        name: readClerkUserName(identity),
        emails,
        timezone: args.timezone,
      }
    )

    return result
  },
})

async function fetchClerkUser(userId: string) {
  const clerkSecretKey = requireEnvironmentVariable("CLERK_SECRET_KEY")

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
