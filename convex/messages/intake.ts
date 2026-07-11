import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { ensureConversation, startMessageRun } from "../conversations/data"
import { findConversation } from "../conversations/resolve"
import { scheduleConversationSummary } from "../conversations/schedule"
import { findActiveIntegrationByExternalId } from "../integrations/data"
import { resolveActor } from "../persons/resolve"
import {
  ensurePlace,
  type ObservedPlace,
  observedPlaceValidator,
} from "../places/data"
import { schedulePlaceProfile } from "../places/schedule"
import { isPersonActor } from "../shared/actor"
import {
  type MessageIntegration,
  messageIntegrationValidator,
} from "../shared/integrations"
import { normalizeSelfActor } from "./actor"
import {
  findMessageByExternalId,
  insertMessage,
  messageHasText,
  type ObservedMessage,
  observedMessageArgs,
} from "./data"
import { recordAutomationEvent } from "./events"
import { messageAudience } from "./surface"

export const record = internalMutation({
  args: {
    integration: messageIntegrationValidator,
    mode: v.optional(v.union(v.literal("record"), v.literal("record_and_run"))),
    place: v.optional(observedPlaceValidator),
    ...observedMessageArgs,
  },
  handler: async (ctx, args) => {
    const integration = await findActiveIntegrationByExternalId(ctx, {
      integration: args.integration,
      externalId: args.accountId,
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

    const { createdBy, message, observed, place } = await insertObservedMessage(
      ctx,
      args,
      integration
    )
    const now = Date.now()
    const mode = args.mode ?? "record_and_run"

    if (place !== null) {
      await schedulePlaceProfile(ctx, place, now)
    }

    if (mode === "record") {
      return { status: "recorded" as const, messageId: message._id }
    }

    if (isPersonActor(message.actor)) {
      await recordAutomationEvent(ctx, { integration, message: observed, now })
    }

    const conversation = await messageRunConversation(ctx, {
      integration,
      message,
    })

    if (conversation === null) {
      return { status: "recorded" as const, messageId: message._id }
    }

    const run = await startMessageRun(ctx, {
      integration,
      message,
      createdBy,
      externalId: message.conversationId,
      now,
      conversation,
    })
    await scheduleConversationSummary(ctx, conversation, now)

    return {
      status: "queued" as const,
      messageId: message._id,
      runId: run.runId,
    }
  },
})

// Records the message with its provider-normalized place (when it landed in
// one) resolved to a stamped row, so every downstream read is one index hop.
async function insertObservedMessage(
  ctx: MutationCtx,
  args: ObservedMessage & {
    integration: MessageIntegration
    place?: ObservedPlace
  },
  integration: Doc<"integrations">
) {
  const observed = observedMessage(args, integration)
  const createdBy = await resolveActor(ctx, {
    tenantId: integration.tenantId,
    provider: args.integration,
    actor: observed.actor,
  })
  const place =
    args.place === undefined
      ? null
      : await ensurePlace(ctx, { integration, place: args.place })
  const message = await insertMessage(ctx, {
    integration,
    message: observed,
    personId: createdBy,
    placeId: place?._id,
  })

  return { createdBy, message, observed, place }
}

function observedMessage(
  message: ObservedMessage,
  integration: Doc<"integrations">
): ObservedMessage {
  return {
    ...message,
    mentioned: normalizeMentioned(message, integration),
    actor: normalizeSelfActor(message.actor, integration),
  }
}

// Slack mention detection happens at the provider edge, where the raw
// payload still carries mention tokens; recorded text is human-readable.
function normalizeMentioned(
  message: ObservedMessage,
  integration: Doc<"integrations">
) {
  if (message.mentioned === true) {
    return true
  }

  if (
    integration.integration === "github" ||
    integration.integration === "linear"
  ) {
    return mentionsMilo(message.text)
  }

  return false
}

function mentionsMilo(text: string | undefined) {
  return text !== undefined && /(?:^|\W)@milo(?:$|\W)/i.test(text)
}

async function messageRunConversation(
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

  if (!messageHasText(args.message)) {
    return null
  }

  return audience.isAddressed || audience.isDirect
    ? await ensureConversation(ctx, {
        externalId: args.message.conversationId,
        integration: args.integration,
        message: args.message,
      })
    : await findConversation(ctx, {
        tenantId: args.integration.tenantId,
        integrationId: args.integration._id,
        externalId: args.message.conversationId,
      })
}
