import { v } from "convex/values"
import { mutation } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { readUserProfile } from "../access/users"
import { accountArgs, ensureAccountPerson } from "../persons/account"
import { createPersonActor } from "../shared/actor"
import { stopRunTree } from "./tree"

export const stop = mutation({
  args: {
    runId: v.id("runs"),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const personId = await ensureAccountPerson(
      ctx,
      accountArgs(identity, args.organizationId)
    )
    const run = await ctx.db.get(args.runId)

    if (run === null || run.organizationId !== args.organizationId) {
      throw new Error("Run not found.")
    }

    await stopRunTree(
      ctx,
      run,
      createPersonActor(personId, readUserProfile(identity))
    )

    return null
  },
})
