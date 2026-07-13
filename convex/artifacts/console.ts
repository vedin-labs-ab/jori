import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { getToolPermission } from "../../contracts/permissions"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { mutation, type QueryCtx, query } from "../_generated/server"
import { listArtifactAutomationRoots } from "../automations/lifecycle/read"
import { checkTenantAccess } from "../identity/access"
import { ensureCurrentPerson, resolveCurrentPerson } from "../persons/clerk"
import { personDisplayName } from "../persons/names"
import {
  findAccessibleArtifact,
  getAccessibleArtifact,
  searchArtifacts,
} from "./access"

export const list = query({
  args: {
    tenantId: v.string(),
    query: v.string(),
    includeArchived: v.boolean(),
  },
  handler: async (ctx, args) => {
    const access = await checkTenantAccess(ctx, args.tenantId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        artifacts: [],
      }
    }

    const personId = await resolveCurrentPerson(ctx, args.tenantId)
    const artifacts = await searchArtifacts(ctx, {
      tenantId: args.tenantId,
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
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
  },
  handler: async (ctx, args) => {
    const access = await checkTenantAccess(ctx, args.tenantId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        artifact: null,
      }
    }

    const personId = await resolveCurrentPerson(ctx, args.tenantId)
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
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.tenantId)

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
    tenantId: v.string(),
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
    await ensureCurrentPerson(ctx, args.tenantId)

    return await ctx.runMutation(internal.artifacts.records.remove, args)
  },
})

export const restore = mutation({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ artifactId: Id<"artifacts">; restored: true }> => {
    await ensureCurrentPerson(ctx, args.tenantId)

    return await ctx.runMutation(internal.artifacts.records.restore, args)
  },
})

export const revokeShare = mutation({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
    shareId: v.id("artifactShares"),
  },
  handler: async (ctx, args): Promise<null> => {
    const personId = await ensureCurrentPerson(ctx, args.tenantId)

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

function summarizeVersion(
  version: Doc<"artifactVersions">,
  currentVersionId: Id<"artifactVersions"> | undefined
) {
  return {
    versionId: version._id,
    parentVersionId: version.parentVersionId,
    treeId: version.treeId,
    entrypoint: version.entrypoint,
    sdk: version.sdk,
    message: version.message,
    createdBy: version.createdBy,
    createdAt: version.createdAt,
    isCurrent: version._id === currentVersionId,
  }
}

function summarizeAutomations(automations: Doc<"automations">[]) {
  return automations.map((automation) => ({
    automationId: automation._id,
    name: automation.name,
    status: automation.status,
    firedAt: automation.firedAt,
    nextAt: automationNextAt(automation),
    updatedAt: automation.updatedAt,
  }))
}

function automationNextAt(automation: Doc<"automations">) {
  if ("nextAt" in automation.trigger) {
    return automation.trigger.nextAt
  }

  return "at" in automation.trigger ? automation.trigger.at : undefined
}

function summarizeCapabilities(capabilities: Doc<"artifactTools">[]) {
  const activeCapabilities = capabilities.filter(
    (capability) => capability.revokedAt === undefined
  )

  return activeCapabilities
    .map((capability) => summarizeCapabilityForConsole(capability))
    .filter((capability) => capability !== null)
}

export function summarizeCapabilityForConsole(
  capability: Pick<
    Doc<"artifactTools">,
    "approvedAt" | "integrationId" | "tool" | "versionId"
  >
) {
  const permission = getToolPermission(capability.tool)

  if (permission === undefined) {
    return null
  }

  return {
    access: permission.access,
    approvedAt: capability.approvedAt,
    description: permission.description,
    integrationId: capability.integrationId,
    label: permission.label,
    surface: permission.surface,
    tool: permission.tool,
    versionId: capability.versionId,
  }
}
