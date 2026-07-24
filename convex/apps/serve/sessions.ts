import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { canAccessApp } from "../access"
import { type AppSessionGrant } from "../schema"
import { getOrganizationApp } from "../storage/links"

export const createSessionRecord = internalMutation({
  args: {
    organizationId: v.string(),
    appId: v.id("apps"),
    personId: v.id("persons"),
    secret: v.string(),
    now: v.number(),
    expiresAt: v.number(),
    tokenExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const app = await getOrganizationApp(ctx, args)

    return await createAppSession(ctx, {
      ...args,
      app,
      grant: "member",
    })
  },
})

/** Insert one session row — the shared factory for both grant edges. */
export async function createAppSession(
  ctx: MutationCtx,
  args: {
    app: Doc<"apps">
    personId: Id<"persons">
    grant: AppSessionGrant
    secret: string
    now: number
    expiresAt: number
    tokenExpiresAt: number
  }
) {
  const { app } = args

  if (!canAccessApp(app, args.personId)) {
    throw new Error("App not found.")
  }

  if (app.versionId === undefined) {
    throw new Error("App has no published version.")
  }

  const sessionId = await ctx.db.insert("appSessions", {
    organizationId: app.organizationId,
    appId: app._id,
    versionId: app.versionId,
    personId: args.personId,
    access: app.access,
    grant: args.grant,
    tokenSecret: args.secret,
    tokenExpiresAt: args.tokenExpiresAt,
    createdAt: args.now,
    seenAt: args.now,
    expiresAt: args.expiresAt,
  })

  return {
    sessionId,
    organizationId: app.organizationId,
    personId: args.personId,
    appId: app._id,
    versionId: app.versionId,
    secret: args.secret,
    expiresAt: args.tokenExpiresAt,
  }
}

export const authorizeSession = internalMutation({
  args: {
    sessionId: v.id("appSessions"),
    appId: v.id("apps"),
    versionId: v.id("appVersions"),
    organizationId: v.string(),
    personId: v.id("persons"),
    secret: v.string(),
    tokenExpiresAt: v.number(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)

    if (
      session === null ||
      session.appId !== args.appId ||
      session.versionId !== args.versionId ||
      session.organizationId !== args.organizationId ||
      session.personId !== args.personId ||
      session.tokenSecret !== args.secret ||
      session.expiresAt <= args.now ||
      args.tokenExpiresAt <= args.now ||
      session.tokenExpiresAt < args.now
    ) {
      return null
    }

    await ctx.db.patch(session._id, { seenAt: args.now })

    return session
  },
})
