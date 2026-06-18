import { v } from "convex/values"
import { internalMutation } from "../../_generated/server"
import { canAccessArtifact } from "../access"
import { getTenantArtifact } from "../storage/links"

export const createSessionRecord = internalMutation({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
    userId: v.string(),
    secret: v.string(),
    now: v.number(),
    expiresAt: v.number(),
    tokenExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const artifact = await getTenantArtifact(ctx, args)

    if (!canAccessArtifact(artifact, args.userId)) {
      throw new Error("Artifact not found.")
    }

    if (artifact.versionId === undefined) {
      throw new Error("Artifact has no published version.")
    }

    const sessionId = await ctx.db.insert("artifactSessions", {
      tenantId: artifact.tenantId,
      artifactId: artifact._id,
      versionId: artifact.versionId,
      userId: args.userId,
      access: artifact.access,
      status: "active",
      tokenSecret: args.secret,
      tokenExpiresAt: args.tokenExpiresAt,
      createdAt: args.now,
      seenAt: args.now,
      expiresAt: args.expiresAt,
    })

    return {
      sessionId,
      tenantId: artifact.tenantId,
      userId: args.userId,
      artifactId: artifact._id,
      versionId: artifact.versionId,
      secret: args.secret,
      expiresAt: args.tokenExpiresAt,
    }
  },
})

export const authorizeSession = internalMutation({
  args: {
    sessionId: v.id("artifactSessions"),
    artifactId: v.id("artifacts"),
    versionId: v.id("artifactVersions"),
    tenantId: v.string(),
    userId: v.string(),
    secret: v.string(),
    tokenExpiresAt: v.number(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)

    if (
      session === null ||
      session.status !== "active" ||
      session.artifactId !== args.artifactId ||
      session.versionId !== args.versionId ||
      session.tenantId !== args.tenantId ||
      session.userId !== args.userId ||
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
