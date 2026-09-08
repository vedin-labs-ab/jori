import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { findActiveIntegrationByExternalId } from "../integrations/data"
import { normalizeSelfActor } from "../messages/actor"
import {
  findMessageByExternalId,
  insertMessage,
  messageHasText,
  type ObservedMessage,
  observedMessageArgs,
} from "../messages/data"
import { recordJobEvent } from "../messages/events"
import { messageAudience } from "../messages/surface"
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
import { ensureConversation, startMessageRun } from "./data"
import { findConversation } from "./resolve"
import { scheduleConversationSummary } from "./summary/schedule"

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
      await recordJobEvent(ctx, { integration, message: observed, now })
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

    if (run.status === "blocked") {
      return { status: "recorded" as const, messageId: message._id }
    }

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
    organizationId: integration.organizationId,
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
    surface: args.integration,
  })

  return { createdBy, message, observed, place }
}

function observedMessage(
  message: ObservedMessage,
  integration: Doc<"integrations">
): ObservedMessage {
  return {
    ...message,
    mentioned: message.mentioned ?? false,
    actor: normalizeSelfActor(message.actor, integration),
  }
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

  const audience = messageAudience(args.message)

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
        organizationId: args.integration.organizationId,
        integrationId: args.integration._id,
        externalId: args.message.conversationId,
      })
}
