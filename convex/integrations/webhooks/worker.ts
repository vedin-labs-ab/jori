import { makeFunctionReference } from "convex/server"
import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { internalAction } from "../../_generated/server"
import { type WebhookProvider } from "./schema"

const consumers = {
  github: "integrations/github/ingress/delivery:process",
  slack: "integrations/slack/ingress/delivery:process",
  linear: "integrations/linear/ingress/delivery:process",
  notion: "integrations/notion/delivery:process",
} satisfies Record<WebhookProvider, string>

export const run = internalAction({
  args: { id: v.id("webhookDeliveries") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const row: Doc<"webhookDeliveries"> | null = await ctx.runMutation(
      internal.integrations.webhooks.delivery.claim,
      { id }
    )
    if (row === null || row.payload === undefined) {
      return null
    }
    let succeeded = false
    try {
      await ctx.runAction(
        makeFunctionReference<
          "action",
          { integrationId: Id<"integrations">; payload: unknown }
        >(consumers[row.provider]),
        { integrationId: row.integrationId, payload: row.payload }
      )
      succeeded = true
    } catch {
      // Exception messages can contain customer content or provider tokens.
      // Persist the failed receipt and retry without copying the error.
    }
    await ctx.runMutation(internal.integrations.webhooks.delivery.finish, {
      id,
      attempt: row.attempts,
      succeeded,
    })
    return null
  },
})
