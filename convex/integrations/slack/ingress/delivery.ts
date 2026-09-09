import { v } from "convex/values"
import { isRecord } from "../../../../contracts/json"
import { internal } from "../../../_generated/api"
import { type ActionCtx, internalAction } from "../../../_generated/server"
import { readString } from "../../../shared/input"
import { handleSlackApprovalInteraction } from "../approvals"
import { handleSlackIntegrationOfferInteraction } from "../offers/interaction"
import {
  getSlackMessage,
  type SlackEventPayload,
  slackEventAccountId,
} from "./events"
import { handleSlackLifecycleEvent } from "./lifecycle"
import { handleSlackMessageEvent } from "./messages"

export const process = internalAction({
  args: { integrationId: v.id("integrations"), payload: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!isRecord(args.payload)) {
      return null
    }
    const event = args.payload.event as SlackEventPayload | undefined
    const interaction = args.payload.interaction
    const accountId =
      args.payload.kind === "event" && event !== undefined
        ? slackEventAccountId(event)
        : readString(isRecord(interaction) ? interaction.team : undefined, "id")
    if (accountId === undefined) {
      return null
    }
    const integration = await ctx.runQuery(
      internal.integrations.lookup.activeByIntegrationExternal,
      { integration: "slack", externalId: accountId }
    )
    if (integration === null || integration._id !== args.integrationId) {
      return null
    }
    if (args.payload.kind === "interaction") {
      await handleInteraction(ctx, interaction)
      return null
    }
    if (event === undefined) {
      return null
    }
    const appId = readString(integration.data, "appId")
    if (appId !== undefined && event.api_app_id !== appId) {
      return null
    }
    if (await handleSlackLifecycleEvent(ctx, integration, event)) {
      return null
    }
    const message = getSlackMessage(event)
    if (message !== null) {
      await handleSlackMessageEvent(ctx, message)
    }
    return null
  },
})

async function handleInteraction(ctx: ActionCtx, payload: unknown) {
  if (!(await handleSlackIntegrationOfferInteraction(ctx, payload))) {
    await handleSlackApprovalInteraction(ctx, payload)
  }
}
