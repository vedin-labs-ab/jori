import { v } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { mutation } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { readUserEmail, readUserName, requireUserId } from "../access/users"
import { ensureAccountPerson } from "../persons/account"
import { createPersonActor } from "../shared/actor"
import { stopRunTree } from "./tree"

export const stop = mutation({
  args: {
    runId: v.id("runs"),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const personId = await ensureAccountPerson(ctx, {
      organizationId: args.organizationId,
      userId: requireUserId(identity),
      email: readUserEmail(identity),
      name: readUserName(identity),
    })
    const run = await ctx.db.get(args.runId)

    if (run === null || run.organizationId !== args.organizationId) {
      throw new Error("Run not found.")
    }

    await stopRunTree(ctx, run, stoppedByActor(personId, identity))

    return null
  },
})

function stoppedByActor(
  personId: Id<"persons">,
  identity: {
    email?: string
    name?: string
    subject?: string
  }
) {
  return createPersonActor(personId, {
    email: readUserEmail(identity),
    name: readUserName(identity),
  })
}
