import { v } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { mutation } from "../_generated/server"
import { requireTenantAccess } from "../access"
import {
  readClerkUserEmail,
  readClerkUserName,
  requireClerkUserId,
} from "../access/users"
import { ensureClerkPerson } from "../persons/clerk"
import { createPersonActor } from "../shared/actor"
import { stopRunTree } from "./tree"

export const stop = mutation({
  args: {
    runId: v.id("runs"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireTenantAccess(ctx, args.tenantId)
    const personId = await ensureClerkPerson(ctx, {
      tenantId: args.tenantId,
      clerkSubject: requireClerkUserId(identity),
      email: readClerkUserEmail(identity),
      name: readClerkUserName(identity),
    })
    const run = await ctx.db.get(args.runId)

    if (run === null || run.tenantId !== args.tenantId) {
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
    email: readClerkUserEmail(identity),
    name: readClerkUserName(identity),
  })
}
