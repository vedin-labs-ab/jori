import { v } from "convex/values"
import { internalMutation } from "../_generated/server"
import { artifactAccess, artifactContract } from "./schema"
import {
  getTenantArtifact,
  insertCapabilities,
  normalizeTitle,
  revokeCapabilities,
} from "./storage/links"
import { insertVersion } from "./storage/objects"
import { purgeArchivedArtifact } from "./storage/purge"
import {
  assetValidator,
  capabilityInputValidator,
  storedBlobValidator,
  treeValidator,
} from "./storage/validators"

// The published version payload shared by the create and update paths.
const publishFields = {
  contract: artifactContract,
  treeId: v.string(),
  trees: v.array(treeValidator),
  blobs: v.array(storedBlobValidator),
  assets: v.array(assetValidator),
  entrypoint: v.string(),
  sdk: v.string(),
  message: v.optional(v.string()),
  capabilities: v.array(capabilityInputValidator),
}

const blueprintField = { blueprint: v.optional(v.string()) }

export const publishCreated = internalMutation({
  args: {
    tenantId: v.string(),
    ownerId: v.id("persons"),
    title: v.string(),
    access: artifactAccess,
    ...blueprintField,
    ...publishFields,
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const blueprintPartition =
      args.access === "personal" ? `person:${args.ownerId}` : "organization"

    if (args.blueprint !== undefined) {
      const existing = await ctx.db
        .query("artifacts")
        .withIndex("by_tenant_and_blueprint", (index) =>
          index
            .eq("tenantId", args.tenantId)
            .eq("blueprintPartition", blueprintPartition)
            .eq("blueprint", args.blueprint)
        )
        .first()

      if (existing !== null) {
        throw new Error(
          `Artifact blueprint already provisioned: ${args.blueprint}`
        )
      }
    }

    const artifactId = await ctx.db.insert("artifacts", {
      tenantId: args.tenantId,
      ownerId: args.ownerId,
      title: normalizeTitle(args.title),
      access: args.access,
      contract: args.contract,
      createdAt: now,
      updatedAt: now,
      ...(args.blueprint === undefined
        ? {}
        : { blueprint: args.blueprint, blueprintPartition }),
    })
    const versionId = await insertVersion(ctx, {
      ...args,
      artifactId,
      createdAt: now,
      createdBy: args.ownerId,
    })

    await ctx.db.patch(artifactId, { versionId })
    await insertCapabilities(ctx, {
      approvedBy: args.ownerId,
      artifactId,
      capabilities: args.capabilities,
      tenantId: args.tenantId,
      versionId,
    })

    return { artifactId, versionId }
  },
})

export const publishUpdated = internalMutation({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
    updatedBy: v.id("persons"),
    title: v.optional(v.string()),
    access: v.optional(artifactAccess),
    ...publishFields,
  },
  handler: async (ctx, args) => {
    const artifact = await getTenantArtifact(ctx, args)
    const now = Date.now()
    const versionId = await insertVersion(ctx, {
      ...args,
      artifactId: args.artifactId,
      createdAt: now,
      createdBy: args.updatedBy,
      parentVersionId: artifact.versionId,
    })

    await ctx.db.patch(args.artifactId, {
      versionId,
      updatedAt: now,
      ...(args.title === undefined
        ? {}
        : { title: normalizeTitle(args.title) }),
      ...(args.access === undefined ? {} : { access: args.access }),
      contract: args.contract,
    })
    await revokeCapabilities(ctx, args.artifactId, now)
    await insertCapabilities(ctx, {
      approvedBy: args.updatedBy,
      artifactId: args.artifactId,
      capabilities: args.capabilities,
      tenantId: args.tenantId,
      versionId,
    })

    return { artifactId: args.artifactId, versionId }
  },
})

export const restore = internalMutation({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
  },
  handler: async (ctx, args) => {
    const artifact = await getTenantArtifact(ctx, args)

    await ctx.db.patch(artifact._id, {
      archivedAt: undefined,
      updatedAt: Date.now(),
    })

    return { artifactId: artifact._id, restored: true as const }
  },
})

export const remove = internalMutation({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
  },
  handler: async (ctx, args) => {
    const artifact = await getTenantArtifact(ctx, args)

    if (artifact.archivedAt !== undefined) {
      return await purgeArchivedArtifact(ctx, args)
    }

    const now = Date.now()

    await ctx.db.patch(artifact._id, {
      archivedAt: now,
      updatedAt: now,
    })

    return { artifactId: artifact._id, archived: true as const }
  },
})
