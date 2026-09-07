import { v } from "convex/values"
import { type Id } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { requireOrganizationAccess } from "../../access"

const lifetimeMs = 10 * 60 * 1000

export async function createInstallAttempt(
  ctx: MutationCtx,
  organizationId: string
) {
  const identity = await requireOrganizationAccess(ctx, organizationId)
  if (typeof identity.sid !== "string") {
    throw new Error("Refresh your session before connecting an integration.")
  }
  return await ctx.db.insert("integrationInstalls", {
    organizationId,
    identity: identity.tokenIdentifier,
    sessionId: identity.sid,
    expiresAt: Date.now() + lifetimeMs,
  })
}

export async function consumeInstallAttempt(
  ctx: MutationCtx,
  attemptId: Id<"integrationInstalls">
) {
  const attempt = await ctx.db.get(attemptId)
  if (attempt === null || attempt.expiresAt < Date.now()) {
    throw new Error(
      "Integration connection expired or already used. Start again."
    )
  }
  const identity = await requireOrganizationAccess(ctx, attempt.organizationId)
  if (
    identity.tokenIdentifier !== attempt.identity ||
    identity.sid !== attempt.sessionId
  ) {
    throw new Error("This integration connection belongs to another user.")
  }
  await ctx.db.delete(attemptId)
  return null
}

export const consume = internalMutation({
  args: { attemptId: v.id("integrationInstalls") },
  handler: async (ctx, args) =>
    await consumeInstallAttempt(ctx, args.attemptId),
})

export const expire = internalMutation({
  args: {},
  handler: async (ctx) => {
    const attempts = await ctx.db
      .query("integrationInstalls")
      .withIndex("by_expiresAt", (query) => query.lt("expiresAt", Date.now()))
      .take(100)
    for (const attempt of attempts) {
      await ctx.db.delete(attempt._id)
    }
    return null
  },
})
