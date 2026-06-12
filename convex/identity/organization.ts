import { v } from "convex/values"
import { action } from "../_generated/server"

export const updateWebsite = action({
  args: {
    tenantId: v.string(),
    website: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new Error("Unauthorized")
    }

    const clerkSecretKey = process.env.CLERK_SECRET_KEY

    if (clerkSecretKey === undefined) {
      throw new Error("Missing CLERK_SECRET_KEY")
    }

    const response = await fetch(
      `https://api.clerk.com/v1/organizations/${args.tenantId}/metadata`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${clerkSecretKey}`,
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          public_metadata: {
            website: args.website === "" ? null : args.website,
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error("Could not update the organization website.")
    }
  },
})
