import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { canAccessArtifact } from "../access"
import { type ArtifactSessionGrant } from "../schema"
import { getOrganizationArtifact } from "../storage/links"

export const createSessionRecord = internalMutation({
  args: {
    organizationId: v.string(),
    artifactId: v.id("artifacts"),
    personId: v.id("persons"),
    secret: v.string(),
    now: v.number(),
    expiresAt: v.number(),
    tokenExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const artifact = await getOrganizationArtifact(ctx, args)

    return await createArtifactSession(ctx, {
      ...args,
      artifact,
      grant: "member",
    })
  },
})

/** Insert one session row — the shared factory for both grant edges. */
export async function createArtifactSession(
  ctx: MutationCtx,
  args: {
    artifact: Doc<"artifacts">
    personId: Id<"persons">
    grant: ArtifactSessionGrant
    secret: string
    now: number
    expiresAt: number
    tokenExpiresAt: number
  }
) {
  const { artifact } = args

  if (!canAccessArtifact(artifact, args.personId)) {
    throw new Error("Artifact not found.")
  }

  if (artifact.versionId === undefined) {
    throw new Error("Artifact has no published version.")
  }

  const sessionId = await ctx.db.insert("artifactSessions", {
    organizationId: artifact.organizationId,
    artifactId: artifact._id,
    versionId: artifact.versionId,
    personId: args.personId,
    access: artifact.access,
    grant: args.grant,
    tokenSecret: args.secret,
    tokenExpiresAt: args.tokenExpiresAt,
    createdAt: args.now,
    seenAt: args.now,
    expiresAt: args.expiresAt,
  })

  return {
    sessionId,
    organizationId: artifact.organizationId,
    personId: args.personId,
    artifactId: artifact._id,
    versionId: artifact.versionId,
    secret: args.secret,
    expiresAt: args.tokenExpiresAt,
  }
}

export const authorizeSession = internalMutation({
  args: {
    sessionId: v.id("artifactSessions"),
    artifactId: v.id("artifacts"),
    versionId: v.id("artifactVersions"),
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
      session.artifactId !== args.artifactId ||
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
