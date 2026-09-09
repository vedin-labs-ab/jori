import { v } from "convex/values"
import { internal } from "../../../_generated/api"
import { internalAction, internalMutation } from "../../../_generated/server"
import { readDataNumber } from "../../../shared/data"
import { getGitHubMessage } from "./events"
import { handleGitHubMessageEvent } from "./http"
import { recordGitHubLifecycleEvent } from "./lifecycle"
import { type GitHubWebhookPayload } from "./types"

export const process = internalAction({
  args: { integrationId: v.id("integrations"), payload: v.any() },
  handler: async (ctx, args) => {
    const webhook = args.payload as {
      event: string
      deliveryId: string
      payload: GitHubWebhookPayload
    }
    const installationId = webhook.payload.installation?.id
    if (installationId === undefined) {
      return
    }
    const integration = await ctx.runQuery(
      internal.integrations.lookup.activeByIntegrationExternal,
      { integration: "github", externalId: String(installationId) }
    )
    if (integration?._id !== args.integrationId) {
      return
    }
    if (
      webhook.event === "installation" &&
      (webhook.payload.action === "deleted" ||
        webhook.payload.action === "suspend")
    ) {
      await ctx.runMutation(
        internal.integrations.github.ingress.delivery.revoke,
        {
          integrationId: args.integrationId,
          installationId: String(installationId),
          suspendedAt: readSuspendedAt(webhook.payload),
        }
      )
      return
    }
    const message = getGitHubMessage(webhook)
    if (message === null) {
      await recordGitHubLifecycleEvent(ctx, webhook)
    } else {
      await handleGitHubMessageEvent(ctx, message)
    }
  },
})

export const revoke = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    installationId: v.string(),
    suspendedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)
    if (
      integration?.integration !== "github" ||
      integration.externalId !== args.installationId ||
      integration.status !== "active"
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

function readSuspendedAt(payload: GitHubWebhookPayload) {
  const timestamp = Date.parse(payload.installation?.suspended_at ?? "")
  return Number.isFinite(timestamp) ? timestamp : undefined
}
