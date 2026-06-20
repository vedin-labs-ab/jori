import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { ensureConversation, findConversation } from "../conversations/data"
import { getLinearBotId } from "../providers/linear/data"
import { getSlackBotId } from "../providers/slack/data"
import { messageAudience } from "../routing/surface"
import { getActorExternalId, isUserActor, withActorKind } from "../shared/actor"
import {
  findActiveIntegration,
  findMessageByExternalId,
  insertMessage,
  messageIntegrationValidator,
  type ObservedMessage,
  observedMessageArgs,
  resolveMessageOwner,
} from "./data"
import { recordAutomationEvent } from "./events"

export const record = internalMutation({
  args: {
    integration: messageIntegrationValidator,
    ...observedMessageArgs,
  },
  handler: async (ctx, args) => {
    const integration = await findActiveIntegration(ctx, {
      integration: args.integration,
      accountId: args.accountId,
    })

    if (integration === null) {
      return { status: "missing_integration" as const }
    }

    const existingMessage = await findMessageByExternalId(ctx, args.externalId)

    if (existingMessage !== null) {
      return {
        status: "duplicate" as const,
        messageId: existingMessage._id,
      }
    }

    const observed = observedMessage(args, integration)
    const message = await insertMessage(ctx, { integration, message: observed })
    const now = Date.now()

    if (isUserActor(message.actor)) {
      await recordAutomationEvent(ctx, { integration, message: observed, now })
    }

    if (!(await shouldRouteMessage(ctx, { integration, message, now }))) {
      return { status: "recorded" as const, messageId: message._id }
    }

    await ctx.scheduler.runAfter(0, internal.routing.message.route, {
      messageId: message._id,
    })

    return { status: "routed" as const, messageId: message._id }
  },
})

function observedMessage(
  message: ObservedMessage,
  integration: Doc<"integrations">
): ObservedMessage {
  return {
    ...message,
    type: normalizeType(message, integration),
    actor: normalizeActor(message.actor, integration),
  }
}

function normalizeType(
  message: ObservedMessage,
  integration: Doc<"integrations">
) {
  if (integration.integration !== "slack" || message.type === "app_mention") {
    return message.type
  }

  const botId = getSlackBotId(integration.data)

  return botId !== undefined && (message.text ?? "").includes(`<@${botId}>`)
    ? "app_mention"
    : message.type
}

function normalizeActor(
  actor: ObservedMessage["actor"],
  integration: Doc<"integrations">
) {
  const actorId = getActorExternalId(actor)
  const selfId = selfActorId(integration)

  return actorId !== undefined && actorId === selfId
    ? withActorKind(actor, "self")
    : actor
}

function selfActorId(integration: Doc<"integrations">) {
  if (integration.integration === "slack") {
    return getSlackBotId(integration.data)
  }

  if (integration.integration === "linear") {
    return getLinearBotId(integration.data)
  }

  return undefined
}

async function shouldRouteMessage(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    message: Doc<"messages">
    now: number
  }
) {
  if (!isUserActor(args.message.actor)) {
    return false
  }

  const audience = messageAudience(args.message, args.integration)
  const createdBy = await resolveMessageOwner(ctx, {
    tenantId: args.integration.tenantId,
    message: args.message,
  })
  const conversation =
    audience.isAddressed || audience.isDirect
      ? await ensureConversation(ctx, {
          tenantId: args.integration.tenantId,
          integrationId: args.integration._id,
          conversationId: args.message.conversationId,
          createdBy,
          now: args.now,
        })
      : await findConversation(ctx, {
          tenantId: args.integration.tenantId,
          integrationId: args.integration._id,
          conversationId: args.message.conversationId,
        })

  return conversation !== null && hasText(args.message)
}

function hasText(message: Doc<"messages">) {
  const text = message.text?.trim()

  return text !== undefined && text !== ""
}
