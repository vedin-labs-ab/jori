import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { internalAction } from "../../_generated/server"
import { normalizeEventData } from "../../events/payload"
import { readDataString } from "../../shared/data"
import { notionEventAllowsBot, readNotionJobEvents } from "./events"
import { enrichNotionEventData } from "./pages"

export const process = internalAction({
  args: {
    integrationId: v.id("integrations"),
    connectionGeneration: v.number(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.runQuery(
      internal.integrations.notion.data.get,
      {
        integrationId: args.integrationId,
      }
    )
    if (
      integration === null ||
      (integration.connectionGeneration ?? 0) !== args.connectionGeneration ||
      !notionEventAllowsBot(
        args.payload,
        readDataString(integration.data, "botId")
      )
    ) {
      return
    }
    for (const event of readNotionJobEvents(args.payload)) {
      if (event.workspaceId !== integration.externalId) {
        return
      }
      const data = normalizeEventData(
        "notion",
        await enrichNotionEventData(ctx, {
          data: event.data,
          pageId: event.pageId,
          integration,
        })
      )
      if (data === undefined) {
        continue
      }
      await ctx.runMutation(
        internal.integrations.notion.data.recordWebhookEvent,
        {
          integrationId: integration._id,
          expectedConnectionGeneration: args.connectionGeneration,
          workspaceId: event.workspaceId,
          key: event.key,
          type: event.type,
          match: event.match,
          actor: event.actor,
          data,
          observedAt: event.observedAt,
        }
      )
    }
  },
})
