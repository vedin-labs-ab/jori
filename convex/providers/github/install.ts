import { v } from "convex/values"
import { internalMutation, mutation } from "../../_generated/server"
import { requireClerkUserId } from "../../identity/users"
import { createUserActor } from "../../schemas/actors"
import { createSignedGitHubState } from "./signing"

export const createInstallState = mutation({
  args: {
    tenantId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new Error("Unauthorized")
    }

    return await createSignedGitHubState({
      tenantId: args.tenantId,
      createdBy: requireClerkUserId(identity),
      returnUrl: args.returnUrl,
      createdAt: Date.now(),
    })
  },
})

export const recordInstallation = internalMutation({
  args: {
    tenantId: v.string(),
    createdBy: v.string(),
    installationId: v.string(),
    profile: v.object({
      id: v.number(),
      html_url: v.optional(v.string()),
      repository_selection: v.optional(v.string()),
      permissions: v.optional(v.record(v.string(), v.string())),
      events: v.optional(v.array(v.string())),
      account: v.optional(
        v.object({
          id: v.optional(v.number()),
          login: v.optional(v.string()),
          type: v.optional(v.string()),
          avatar_url: v.optional(v.string()),
          html_url: v.optional(v.string()),
        })
      ),
      app_slug: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const createdBy = createUserActor(args.createdBy)
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_provider_account", (query) =>
        query.eq("provider", "github").eq("accountId", args.installationId)
      )
      .first()

    const credentials = {
      installationId: args.installationId,
    }
    const data = {
      installationId: args.installationId,
      installationUrl: args.profile.html_url,
      repositorySelection: args.profile.repository_selection,
      permissions: args.profile.permissions,
      events: args.profile.events,
      appSlug: args.profile.app_slug,
      account: args.profile.account,
    }

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        tenantId: args.tenantId,
        credentials,
        status: "active",
        createdBy,
        data,
      })

      return existing._id
    }

    return await ctx.db.insert("integrations", {
      tenantId: args.tenantId,
      provider: "github",
      accountId: args.installationId,
      credentials,
      status: "active",
      createdBy,
      createdAt: now,
      data,
    })
  },
})
