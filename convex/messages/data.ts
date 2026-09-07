import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { resolveActor } from "../persons/resolve"
import { type Actor, actorValidator } from "../shared/actor"
import { insertRow } from "../shared/context"
import {
  type MessageIntegration,
  type MessageSurface,
} from "../shared/integrations"
import { messageDataReactionTargetKey } from "./identifiers"

export const observedMessageArgs = {
  accountId: v.string(),
  type: v.string(),
  externalId: v.string(),
  mentioned: v.optional(v.boolean()),
  actor: v.optional(actorValidator),
  conversationId: v.string(),
  text: v.optional(v.string()),
  observedAt: v.optional(v.number()),
  data: v.optional(v.any()),
}

export type ObservedMessage = {
  type: string
  externalId: string
  mentioned?: boolean
  actor?: Actor
  conversationId: string
  text?: string
  observedAt?: number
  data?: unknown
}

export function messageHasText(message: Doc<"messages">) {
  const text = message.text?.trim()

  return text !== undefined && text !== ""
}

export async function findMessageByExternalId(
  ctx: MutationCtx,
  externalId: string
) {
  return await ctx.db
    .query("messages")
    .withIndex("by_external_id", (query) => query.eq("externalId", externalId))
    .first()
}

export async function insertMessage(
  ctx: MutationCtx,
  input: {
    integration: Doc<"integrations">
    message: ObservedMessage
    personId: Id<"persons"> | undefined
    placeId: Id<"places"> | undefined
    surface: MessageIntegration
  }
): Promise<Doc<"messages">> {
  const now = Date.now()
  return await insertRow(ctx, "messages", {
    organizationId: input.integration.organizationId,
    surface: input.surface,
    integrationId: input.integration._id,
    type: input.message.type,
    externalId: input.message.externalId,
    mentioned: input.message.mentioned ?? false,
    actor: input.message.actor,
    personId: input.personId,
    conversationId: input.message.conversationId,
    placeId: input.placeId,
    targetKey: messageDataReactionTargetKey(input.surface, input.message.data),
    text: input.message.text,
    data: input.message.data,
    observedAt: input.message.observedAt,
    createdAt: now,
  })
}

/** Console messages are stamped with their person at write time; a provider
 *  message without one is resolved through its observed actor. */
export async function resolveMessageOwner(
  ctx: MutationCtx,
  input: {
    surface: MessageSurface
    message: ObservedMessage | Doc<"messages">
    organizationId: string
  }
) {
  if ("personId" in input.message && input.message.personId !== undefined) {
    return input.message.personId
  }

  if (input.surface === "console") {
    return undefined
  }

  return await resolveActor(ctx, {
    organizationId: input.organizationId,
    provider: input.surface,
    actor: input.message.actor,
  })
}
