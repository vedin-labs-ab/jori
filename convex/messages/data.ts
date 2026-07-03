import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { resolveActor } from "../persons/resolve"
import { type Actor, actorValidator } from "../shared/actor"
import { messageDataReactionTargetKey } from "./identifiers"

export const messageIntegrationValidator = v.union(
  v.literal("github"),
  v.literal("linear"),
  v.literal("slack")
)

export type MessageIntegration = "github" | "linear" | "slack"

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

export async function activeMessageIntegration(
  ctx: QueryCtx,
  message: Doc<"messages">
) {
  const integration = await ctx.db.get(message.integrationId)

  return integration?.integration === message.integration &&
    integration.status === "active"
    ? integration
    : null
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
  }
): Promise<Doc<"messages">> {
  const now = Date.now()
  const messageId = await ctx.db.insert("messages", {
    tenantId: input.integration.tenantId,
    integrationId: input.integration._id,
    integration: input.integration.integration,
    type: input.message.type,
    externalId: input.message.externalId,
    mentioned: input.message.mentioned ?? false,
    actor: input.message.actor,
    personId: input.personId,
    conversationId: input.message.conversationId,
    targetKey: messageDataReactionTargetKey(
      input.integration.integration,
      input.message.data
    ),
    text: input.message.text,
    data: input.message.data,
    observedAt: input.message.observedAt,
    createdAt: now,
  })
  const message = await ctx.db.get(messageId)

  if (message === null) {
    throw new Error("Message insert failed.")
  }

  return message
}

export async function resolveMessageOwner(
  ctx: MutationCtx,
  input: {
    integration: MessageIntegration
    message: ObservedMessage | Doc<"messages">
    tenantId: string
  }
) {
  if ("personId" in input.message && input.message.personId !== undefined) {
    return input.message.personId
  }

  return await resolveActor(ctx, {
    tenantId: input.tenantId,
    provider: input.integration,
    actor: input.message.actor,
  })
}
