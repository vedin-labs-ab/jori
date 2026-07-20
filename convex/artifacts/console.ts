import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { mutation, type QueryCtx, query } from "../_generated/server"
import { checkOrganizationAccess } from "../access"
import { listArtifactAutomationRoots } from "../automations/lifecycle/read"
import { ensureCurrentPerson, resolveCurrentPerson } from "../persons/clerk"
import { personDisplayName } from "../persons/names"
import {
  findAccessibleArtifact,
  getAccessibleArtifact,
  searchArtifacts,
} from "./access"
import {
  summarizeAutomations,
  summarizeCapabilities,
  summarizeVersion,
  templateProvenance,
} from "./summary"

export const list = query({
  args: {
    organizationId: v.string(),
    query: v.string(),
    includeArchived: v.boolean(),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        artifacts: [],
      }
    }

    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const artifacts = await searchArtifacts(ctx, {
      organizationId: args.organizationId,
      personId,
      query: args.query,
      includeArchived: args.includeArchived,
      limit: 100,
    })

    return {
      status: "ready" as const,
      artifacts: await Promise.all(
        artifacts.map(
          async (artifact) => await summarizeForConsole(ctx, artifact)
        )
      ),
    }
  },
})

export const get = query({
  args: {
    organizationId: v.string(),
    artifactId: v.id("artifacts"),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        artifact: null,
      }
    }

    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const artifact = await findAccessibleArtifact(ctx, { ...args, personId })

    if (artifact === null) {
      return {
        status: "not_found" as const,
        artifact: null,
      }
    }

    return {
      status: "ready" as const,
      artifact: await summarizeForConsole(ctx, artifact),
    }
  },
})

/** Expiration order is also lifecycle order: every future expiry sorts ahead
 *  of every past expiry, so one indexed cursor yields active links first. */
export const pageShares = query({
  args: {
    organizationId: v.string(),
    artifactId: v.id("artifacts"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)

    await getAccessibleArtifact(ctx, { ...args, personId })

    const result = await ctx.db
      .query("artifactShares")
      .withIndex("by_artifact_and_expires_at", (index) =>
        index.eq("artifactId", args.artifactId)
      )
      .order("desc")
      .paginate(args.paginationOpts)

    return {
      ...result,
      page: result.page.map((share) => ({
        shareId: share._id,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
      })),
    }
  },
})

export const remove = mutation({
  args: {
    organizationId: v.string(),
    artifactId: v.id("artifacts"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    artifactId: Id<"artifacts">
    archived?: true
    deleted?: true
  }> => {
    await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.artifacts.records.remove, args)
  },
})

export const restore = mutation({
  args: {
    organizationId: v.string(),
    artifactId: v.id("artifacts"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ artifactId: Id<"artifacts">; restored: true }> => {
    await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.artifacts.records.restore, args)
  },
})

export const revokeShare = mutation({
  args: {
    organizationId: v.string(),
    artifactId: v.id("artifacts"),
    shareId: v.id("artifactShares"),
  },
  handler: async (ctx, args): Promise<null> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    await ctx.runMutation(internal.artifacts.serve.share.revoke, {
      ...args,
      personId,
    })

    return null
  },
})

async function summarizeForConsole(ctx: QueryCtx, artifact: Doc<"artifacts">) {
  const versions = await ctx.db
    .query("artifactVersions")
    .withIndex("by_artifact", (index) => index.eq("artifactId", artifact._id))
    .order("desc")
    .take(20)
  const automations = await listArtifactAutomationRoots(ctx, artifact._id, 20)
  const capabilities = await ctx.db
    .query("artifactTools")
    .withIndex("by_artifact", (index) => index.eq("artifactId", artifact._id))
    .take(50)

  return {
    artifactId: artifact._id,
    title: artifact.title,
    access: artifact.access,
    ownerId: artifact.ownerId,
    ownerName: await personDisplayName(ctx, artifact.ownerId),
    versionId: artifact.versionId,
    contract: artifact.contract,
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt,
    archivedAt: artifact.archivedAt,
    lastOpenedAt: await lastOpenedAt(ctx, artifact._id),
    template: templateProvenance(versions, artifact.versionId),
    versions: versions.map((version) =>
      summarizeVersion(version, artifact.versionId)
    ),
    automations: summarizeAutomations(automations),
    capabilities: summarizeCapabilities(capabilities),
  }
}

async function lastOpenedAt(ctx: QueryCtx, artifactId: Id<"artifacts">) {
  const latestSession = await ctx.db
    .query("artifactSessions")
    .withIndex("by_artifact_and_seen_at", (index) =>
      index.eq("artifactId", artifactId)
    )
    .order("desc")
    .first()

  return latestSession?.seenAt
}
