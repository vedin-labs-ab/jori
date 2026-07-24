import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { pauseAutomation } from "../automations/lifecycle"
import { appAccess, appContract, appTemplateStamp } from "./schema"
import {
  getOrganizationApp,
  insertCapabilities,
  normalizeTitle,
  revokeCapabilities,
} from "./storage/links"
import { insertVersion } from "./storage/objects"
import { purgeArchivedApp } from "./storage/purge"
import {
  assetValidator,
  capabilityInputValidator,
  storedBlobValidator,
  treeValidator,
} from "./storage/validators"

// The published version payload shared by the create and update paths.
const publishFields = {
  contract: appContract,
  treeId: v.string(),
  trees: v.array(treeValidator),
  blobs: v.array(storedBlobValidator),
  assets: v.array(assetValidator),
  entrypoint: v.string(),
  sdk: v.string(),
  message: v.optional(v.string()),
  template: v.optional(appTemplateStamp),
  capabilities: v.array(capabilityInputValidator),
}

export const publishCreated = internalMutation({
  args: {
    organizationId: v.string(),
    ownerId: v.id("persons"),
    title: v.string(),
    access: appAccess,
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
        .query("apps")
        .withIndex("by_organization_and_template", (index) =>
          index
            .eq("organizationId", args.organizationId)
            .eq("templatePartition", templatePartition)
            .eq("template", canonical.key)
        )
        .first()

      if (existing !== null) {
        throw new Error(`App template already provisioned: ${canonical.key}`)
      }
    }

    const appId = await ctx.db.insert("apps", {
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
      appId,
      createdAt: now,
      createdBy: args.ownerId,
    })

    await ctx.db.patch(appId, { versionId })
    await insertCapabilities(ctx, {
      approvedBy: args.ownerId,
      appId,
      capabilities: args.capabilities,
      organizationId: args.organizationId,
      versionId,
    })

    return { appId, versionId }
  },
})

export const publishUpdated = internalMutation({
  args: {
    organizationId: v.string(),
    appId: v.id("apps"),
    updatedBy: v.id("persons"),
    title: v.optional(v.string()),
    access: v.optional(appAccess),
    ...publishFields,
  },
  handler: async (ctx, args) => {
    const app = await getOrganizationApp(ctx, args)
    const now = Date.now()
    const versionId = await insertVersion(ctx, {
      ...args,
      appId: args.appId,
      createdAt: now,
      createdBy: args.updatedBy,
      parentVersionId: app.versionId,
    })

    await ctx.db.patch(args.appId, {
      versionId,
      updatedAt: now,
      ...(args.title === undefined
        ? {}
        : { title: normalizeTitle(args.title) }),
      ...(args.access === undefined ? {} : { access: args.access }),
      contract: args.contract,
    })
    await revokeCapabilities(ctx, args.appId, now)
    await insertCapabilities(ctx, {
      approvedBy: args.updatedBy,
      appId: args.appId,
      capabilities: args.capabilities,
      organizationId: args.organizationId,
      versionId,
    })

    return { appId: args.appId, versionId }
  },
})

export const restore = internalMutation({
  args: {
    organizationId: v.string(),
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    const app = await getOrganizationApp(ctx, args)

    await ctx.db.patch(app._id, {
      archivedAt: undefined,
      updatedAt: Date.now(),
    })

    return { appId: app._id, restored: true as const }
  },
})

export const remove = internalMutation({
  args: {
    organizationId: v.string(),
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    const app = await getOrganizationApp(ctx, args)

    if (app.archivedAt !== undefined) {
      return await purgeArchivedApp(ctx, args)
    }

    const now = Date.now()

    await pauseAppAutomations(ctx, app)
    await ctx.db.patch(app._id, {
      archivedAt: now,
      updatedAt: now,
    })

    return { appId: app._id, archived: true as const }
  },
})

/** An archived app must not keep collecting writes: recurring
 *  automations bound to it pause, and their owned one-time children go
 *  with them. Restoring the app leaves resuming to the user. */
async function pauseAppAutomations(ctx: MutationCtx, app: Doc<"apps">) {
  const automations = await ctx.db
    .query("automations")
    .withIndex("by_app", (index) => index.eq("appId", app._id))
    .take(100)

  for (const automation of automations) {
    if (
      automation.organizationId === app.organizationId &&
      automation.type !== "once" &&
      automation.status === "active"
    ) {
      await pauseAutomation(ctx, {
        organizationId: app.organizationId,
        automationId: automation._id,
      })
    }
  }
}
