import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { resolveActor } from "../persons/resolve"
import { isGitHubSelfActor } from "../providers/github/data"
import { getLinearBotId } from "../providers/linear/data"
import { getSlackBotUserId } from "../providers/slack/data"
import {
  getActorExternalId,
  isPersonActor,
  withActorKind,
} from "../shared/actor"
import { ensureWatch, findWatch, startMessageRun } from "../watches/data"
import {
  findActiveIntegration,
  findMessageByExternalId,
  insertMessage,
  messageIntegrationValidator,
  type ObservedMessage,
  observedMessageArgs,
} from "./data"
import { recordAutomationEvent } from "./events"
import { messageAudience } from "./surface"

export const record = internalMutation({
  args: {
    integration: messageIntegrationValidator,
    mode: v.optional(v.union(v.literal("record"), v.literal("record_and_run"))),
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
    const createdBy = await resolveActor(ctx, {
      tenantId: integration.tenantId,
      provider: args.integration,
      actor: observed.actor,
    })
    const message = await insertMessage(ctx, { integration, message: observed })
    const now = Date.now()
    const mode = args.mode ?? "record_and_run"

    if (mode === "record") {
      return { status: "recorded" as const, messageId: message._id }
    }

    if (isPersonActor(message.actor)) {
      await recordAutomationEvent(ctx, { integration, message: observed, now })
    }

    const watch = await messageRunWatch(ctx, { integration, message })

    if (watch === null) {
      return { status: "recorded" as const, messageId: message._id }
    }

    const run = await startMessageRun(ctx, {
      integration,
      message,
      createdBy,
      externalId: message.conversationId ?? message.externalId,
      now,
      watch,
    })

    return {
      status: "queued" as const,
      messageId: message._id,
      runId: run.runId,
    }
  },
})

function observedMessage(
  message: ObservedMessage,
  integration: Doc<"integrations">
): ObservedMessage {
  return {
    ...message,
    mentioned: normalizeMentioned(message, integration),
    actor: normalizeActor(message.actor, integration),
  }
}

function normalizeMentioned(
  message: ObservedMessage,
  integration: Doc<"integrations">
) {
  if (message.mentioned === true) {
    return true
  }

  if (integration.integration === "slack") {
    return slackMentionsMilo(message.text, integration)
  }

  if (
    integration.integration === "github" ||
    integration.integration === "linear"
  ) {
    return mentionsMilo(message.text)
  }

  return false
}

function slackMentionsMilo(
  text: string | undefined,
  integration: Doc<"integrations">
) {
  const botUserId = getSlackBotUserId(integration.data)

  return botUserId !== undefined && (text ?? "").includes(`<@${botUserId}>`)
}

function mentionsMilo(text: string | undefined) {
  return text !== undefined && /(?:^|\W)@milo(?:$|\W)/i.test(text)
}

function normalizeActor(
  actor: ObservedMessage["actor"],
  integration: Doc<"integrations">
) {
  if (isGitHubSelfActor(actor, integration)) {
    return withActorKind(actor, "self")
  }

  const actorId = getActorExternalId(actor)
  const selfId = selfActorId(integration)

  return actorId !== undefined && actorId === selfId
    ? withActorKind(actor, "self")
    : actor
}

function selfActorId(integration: Doc<"integrations">) {
  if (integration.integration === "linear") {
    return getLinearBotId(integration.data)
  }

  if (integration.integration === "slack") {
    return getSlackBotUserId(integration.data)
  }

  return undefined
}

async function messageRunWatch(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    message: Doc<"messages">
  }
) {
  if (!isPersonActor(args.message.actor)) {
    return null
  }

  const audience = messageAudience(args.message, args.integration)

  if (!hasText(args.message)) {
    return null
  }

  return audience.isAddressed || audience.isDirect
    ? await ensureWatch(ctx, {
        tenantId: args.integration.tenantId,
        integrationId: args.integration._id,
        externalId: args.message.conversationId,
      })
    : await findWatch(ctx, {
        tenantId: args.integration.tenantId,
        integrationId: args.integration._id,
        externalId: args.message.conversationId,
      })
}

function hasText(message: Doc<"messages">) {
  const text = message.text?.trim()

  return text !== undefined && text !== ""
}
