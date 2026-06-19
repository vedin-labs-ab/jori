import { internalMutation } from "../_generated/server"
import { getSlackBotId } from "../providers/slack/data"
import { getActorExternalId } from "../shared/actor"
import {
  findActiveIntegration,
  findMessageByExternalId,
  insertMessage,
  observedMessageArgs,
} from "./data"
import { recordAutomationEvent } from "./events"

export const record = internalMutation({
  args: observedMessageArgs,
  handler: async (ctx, args) => {
    const integration = await findActiveIntegration(ctx, {
      integration: "slack",
      accountId: args.accountId,
    })

    if (integration === null) {
      return { status: "missing_integration" as const }
    }

    if (
      isSlackBotMessage(
        getActorExternalId(args.actor, "slack"),
        integration.data
      )
    ) {
      return { status: "ignored_bot" as const }
    }

    const existingMessage = await findMessageByExternalId(ctx, args.externalId)

    if (existingMessage !== null) {
      return {
        status: "duplicate" as const,
        messageId: existingMessage._id,
      }
    }

    const message = await insertMessage(ctx, { integration, message: args })
    const now = Date.now()

    await recordAutomationEvent(ctx, {
      integration,
      message: args,
      now,
    })

    return { status: "recorded" as const, messageId: message._id }
  },
})

function isSlackBotMessage(actorId: string | undefined, data: unknown) {
  if (actorId === undefined) {
    return false
  }

  return actorId === getSlackBotId(data)
}
