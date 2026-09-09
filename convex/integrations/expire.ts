import { v } from "convex/values"
import { internalMutation } from "../_generated/server"
import {
  credentialSnapshotValidator,
  matchesCredentialSnapshot,
} from "./connect/snapshot"

export const markExpired = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    expectedSnapshot: credentialSnapshotValidator,
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)

    if (
      integration === null ||
      !matchesCredentialSnapshot(integration, args.expectedSnapshot)
    ) {
      return false
    }

    await ctx.db.patch(args.integrationId, {
      status: "expired",
      updatedAt: Date.now(),
    })
    return true
  },
})
