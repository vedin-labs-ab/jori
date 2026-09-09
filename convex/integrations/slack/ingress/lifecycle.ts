import { v } from "convex/values"
import { internal } from "../../../_generated/api"
import { type Doc } from "../../../_generated/dataModel"
import { type ActionCtx, internalMutation } from "../../../_generated/server"
import { readNumber } from "../../../shared/input"
import {
  credentialSnapshot,
  credentialSnapshotValidator,
  matchesCredentialSnapshot,
} from "../../connect/snapshot"
import { prepareIntegrationForRuntime } from "../../runtime"
import { requireSlackCredentials } from "../credentials"
import { slackGrantIsDead } from "../oauth"
import { type SlackEventPayload } from "./events"

export async function handleSlackLifecycleEvent(
  ctx: ActionCtx,
  integration: Doc<"integrations">,
  payload: SlackEventPayload,
  expectedConnectionGeneration?: number
) {
  const type = payload.event?.type
  if (type !== "app_uninstalled" && type !== "tokens_revoked") {
    return false
  }
  const installedAt =
    readNumber(integration.data, "installedAt") ?? integration.createdAt
  let snapshot = credentialSnapshot(integration)
  // Slack can deliver an old uninstall after a fresh OAuth installation.
  if (
    payload.event_time !== undefined &&
    (payload.event_time + 1) * 1000 <= installedAt
  ) {
    return true
  }
  if (type === "tokens_revoked") {
    // Events contain user IDs, not token values. A prior token may have been
    // revoked during rotation or reauthorization, so test the current grant.
    const current = await prepareIntegrationForRuntime(ctx, { integration })
    snapshot = credentialSnapshot(current)
    const credentials = requireSlackCredentials(current)
    const valid = await Promise.all([
      slackTokenIsValid(credentials.bot.access),
      slackTokenIsValid(credentials.user.access),
    ])
    if (valid.every(Boolean)) {
      return true
    }
  }
  await ctx.runMutation(
    internal.integrations.slack.ingress.lifecycle.deactivate,
    {
      integrationId: integration._id,
      installedAt,
      expectedSnapshot: snapshot,
      ...(expectedConnectionGeneration === undefined
        ? {}
        : { expectedConnectionGeneration }),
      status: type === "app_uninstalled" ? "disconnected" : "expired",
    }
  )
  return true
}

export const deactivate = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    installedAt: v.number(),
    expectedSnapshot: credentialSnapshotValidator,
    expectedConnectionGeneration: v.optional(v.number()),
    status: v.union(v.literal("disconnected"), v.literal("expired")),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)
    if (
      integration === null ||
      integration.integration !== "slack" ||
      !matchesCredentialSnapshot(integration, args.expectedSnapshot) ||
      (args.expectedConnectionGeneration !== undefined &&
        (integration.connectionGeneration ?? 0) !==
          args.expectedConnectionGeneration)
    ) {
      return
    }
    const installedAt =
      readNumber(integration.data, "installedAt") ?? integration.createdAt
    if (installedAt !== args.installedAt) {
      return
    }
    await ctx.db.patch(integration._id, {
      status: args.status,
      credentials: {},
      updatedAt: Date.now(),
    })
  },
})

async function slackTokenIsValid(token: string) {
  const response = await fetch("https://slack.com/api/auth.test", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new Error("Slack token validation is unavailable")
  }
  const result = (await response.json()) as { ok?: boolean; error?: string }
  if (result.ok === true) {
    return true
  }
  if (slackGrantIsDead(result.error)) {
    return false
  }
  throw new Error("Slack token validation could not be completed")
}
