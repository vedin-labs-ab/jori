import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { pauseAutomation } from "../automations/lifecycle"
import {
  artifactAccess,
  artifactContract,
  artifactTemplateStamp,
} from "./schema"
import {
  getOrganizationArtifact,
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
  template: v.optional(artifactTemplateStamp),
  capabilities: v.array(capabilityInputValidator),
}

export const publishCreated = internalMutation({
  args: {
    organizationId: v.string(),
    ownerId: v.id("persons"),
    title: v.string(),
    access: artifactAccess,
    /** Claim the canonical playbook-provisioned slot for this template. */
    canonical: v.optional(v.boolean()),
    ...publishFields,
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const canonical = args.canonical === true ? args.template : undefined
    const templatePartition =
      args.access === "personal" ? `person:${args.ownerId}` : "organization"

    if (canonical !== undefined) {
      const existing = await ctx.db
        .query("artifacts")
        .withIndex("by_organization_and_template", (index) =>
          index
            .eq("organizationId", args.organizationId)
            .eq("templatePartition", templatePartition)
            .eq("template", canonical.key)
        )
        .first()

      if (existing !== null) {
        throw new Error(
          `Artifact template already provisioned: ${canonical.key}`
        )
      }
    }

    const artifactId = await ctx.db.insert("artifacts", {
      organizationId: args.organizationId,
      ownerId: args.ownerId,
      title: normalizeTitle(args.title),
      access: args.access,
      contract: args.contract,
      createdAt: now,
      updatedAt: now,
      ...(canonical === undefined
        ? {}
        : { template: canonical.key, templatePartition }),
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
      organizationId: args.organizationId,
      versionId,
    })

    return { artifactId, versionId }
  },
})

export const publishUpdated = internalMutation({
  args: {
    organizationId: v.string(),
    artifactId: v.id("artifacts"),
    updatedBy: v.id("persons"),
    title: v.optional(v.string()),
    access: v.optional(artifactAccess),
    ...publishFields,
  },
  handler: async (ctx, args) => {
    const artifact = await getOrganizationArtifact(ctx, args)
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
      organizationId: args.organizationId,
      versionId,
    })

    return { artifactId: args.artifactId, versionId }
  },
})

export const restore = internalMutation({
  args: {
    organizationId: v.string(),
    artifactId: v.id("artifacts"),
  },
  handler: async (ctx, args) => {
    const artifact = await getOrganizationArtifact(ctx, args)

    await ctx.db.patch(artifact._id, {
      archivedAt: undefined,
      updatedAt: Date.now(),
    })

    return { artifactId: artifact._id, restored: true as const }
  },
})

export const remove = internalMutation({
  args: {
    organizationId: v.string(),
    artifactId: v.id("artifacts"),
  },
  handler: async (ctx, args) => {
    const artifact = await getOrganizationArtifact(ctx, args)

    if (artifact.archivedAt !== undefined) {
      return await purgeArchivedArtifact(ctx, args)
    }

    const now = Date.now()

    await pauseArtifactAutomations(ctx, artifact)
    await ctx.db.patch(artifact._id, {
      archivedAt: now,
      updatedAt: now,
    })

    return { artifactId: artifact._id, archived: true as const }
  },
})

/** An archived artifact must not keep collecting writes: recurring
 *  automations bound to it pause, and their owned one-time children go
 *  with them. Restoring the artifact leaves resuming to the user. */
async function pauseArtifactAutomations(
  ctx: MutationCtx,
  artifact: Doc<"artifacts">
) {
  const automations = await ctx.db
    .query("automations")
    .withIndex("by_artifact", (index) => index.eq("artifactId", artifact._id))
    .take(100)

  for (const automation of automations) {
    if (
      automation.organizationId === artifact.organizationId &&
      automation.type !== "once" &&
      automation.status === "active"
    ) {
      await pauseAutomation(ctx, {
        organizationId: artifact.organizationId,
        automationId: automation._id,
      })
    }
  }
}
