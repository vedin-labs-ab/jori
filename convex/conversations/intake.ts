import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { findActiveIntegrationByExternalId } from "../integrations/data"
import { normalizeSelfActor } from "../integrations/messages/actor"
import {
  conversationScope,
  messageAudience,
} from "../integrations/messages/audience"
import { recordJobEvent } from "../integrations/messages/events"
import { messageDataReactionTargetKey } from "../integrations/messages/identifiers"
import { screenWriter } from "../integrations/outsiders/screen"
import {
  findMessageByExternalId,
  insertMessage,
  messageHasText,
  type ObservedMessage,
  observedMessageArgs,
} from "../messages/data"
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
import { startMessageRun } from "./execution"
import { ensureConversation } from "./records"
import { findConversation } from "./resolve"
import { scheduleConversationSummary } from "./summary/schedule"

export const record = internalMutation({
  args: {
    integration: messageIntegrationValidator,
    expectedConnectionGeneration: v.optional(v.number()),
    mode: v.optional(v.union(v.literal("record"), v.literal("record_and_run"))),
    place: v.optional(observedPlaceValidator),
    ...observedMessageArgs,
  },
  handler: async (ctx, args) => {
    const integration = await findActiveIntegrationByExternalId(ctx, {
      integration: args.integration,
      externalId: args.accountId,
    })

    if (
      integration === null ||
      (args.expectedConnectionGeneration !== undefined &&
        (integration.connectionGeneration ?? 0) !==
          args.expectedConnectionGeneration)
    ) {
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
    const now = Date.now()
    const mode = args.mode ?? "record_and_run"
    const isPerson = isPersonActor(observed.actor)

    // Jobs hear every person's event, as data; replayed history is not one.
    if (isPerson && mode !== "record") {
      await recordJobEvent(ctx, { integration, message: observed, now })
    }

    const createdBy = isPerson
      ? await screenWriter(ctx, {
          integration,
          provider: args.integration,
          actor: observed.actor,
          attempt: mode === "record" ? undefined : "message",
          conversationId: args.conversationId,
        })
      : undefined

    // An outsider's words stop here: never stored, so they reach no run,
    // summary, or place profile.
    if (isPerson && createdBy === undefined) {
      return { status: "outsider" as const }
    }

    const { message, place } = await insertObservedMessage(ctx, {
      args,
      createdBy,
      integration,
      observed,
    })

    if (place !== null) {
      await schedulePlaceProfile(ctx, place, now)
    }

    return mode === "record"
      ? { status: "recorded" as const, messageId: message._id }
      : await runMessage(ctx, { createdBy, integration, message, now })
  },
})

async function runMessage(
  ctx: MutationCtx,
  args: {
    createdBy: Id<"persons"> | undefined
    integration: Doc<"integrations">
    message: Doc<"messages">
    now: number
  }
) {
  const { integration, message, now } = args
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
    createdBy: args.createdBy,
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
}

// Records the message with its provider-normalized place (when it landed in
// one) resolved to a stamped row, so every downstream read is one index hop.
async function insertObservedMessage(
  ctx: MutationCtx,
  {
    args,
    createdBy,
    integration,
    observed,
  }: {
    args: { integration: MessageIntegration; place?: ObservedPlace }
    createdBy: Id<"persons"> | undefined
    integration: Doc<"integrations">
    observed: ObservedMessage
  }
) {
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
    targetKey: messageDataReactionTargetKey(args.integration, observed.data),
  })

  return { message, place }
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
        scope: conversationScope(args.message),
      })
    : await findConversation(ctx, {
        organizationId: args.integration.organizationId,
        integrationId: args.integration._id,
        externalId: args.message.conversationId,
      })
}
