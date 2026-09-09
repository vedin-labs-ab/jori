import { v } from "convex/values"
import { internal } from "../../../_generated/api"
import { internalAction, internalMutation } from "../../../_generated/server"
import { readDataNumber } from "../../../shared/data"
import { handleGitHubMessageEvent } from "./http"
import { recordGitHubLifecycle } from "./lifecycle"
import { type PreparedGitHubEvent } from "./prepare"

export const process = internalAction({
  args: {
    integrationId: v.id("integrations"),
    connectionGeneration: v.number(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const event = args.payload as PreparedGitHubEvent
    const integration = await ctx.runQuery(
      internal.integrations.lookup.activeByIntegrationExternal,
      { integration: "github", externalId: event.accountId }
    )
    if (
      integration?._id !== args.integrationId ||
      (integration.connectionGeneration ?? 0) !== args.connectionGeneration
    ) {
      return
    }
    if (event.kind === "revocation") {
      await ctx.runMutation(
        internal.integrations.github.ingress.delivery.revoke,
        {
          integrationId: args.integrationId,
          installationId: event.accountId,
          suspendedAt: event.suspendedAt,
          expectedConnectionGeneration: args.connectionGeneration,
        }
      )
      return
    }
    if (event.kind === "lifecycle") {
      await recordGitHubLifecycle(
        ctx,
        event.lifecycle,
        args.connectionGeneration
      )
    } else {
      await handleGitHubMessageEvent(
        ctx,
        event.message,
        args.connectionGeneration
      )
    }
  },
})

export const revoke = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    installationId: v.string(),
    suspendedAt: v.optional(v.number()),
    expectedConnectionGeneration: v.number(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)
    if (
      integration?.integration !== "github" ||
      integration.externalId !== args.installationId ||
      integration.status !== "active" ||
      (integration.connectionGeneration ?? 0) !==
        args.expectedConnectionGeneration
    ) {
      return
    }
    const installedAt = readDataNumber(integration.data, "installedAt")
    if (
      args.suspendedAt !== undefined &&
      installedAt !== undefined &&
      args.suspendedAt <= installedAt
    ) {
      return
    }
    await ctx.db.patch(integration._id, {
      status: "expired",
      credentials: { installationId: args.installationId },
      updatedAt: Date.now(),
    })
  },
})
