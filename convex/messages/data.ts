import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { resolveUserIdByEmail } from "../identity/identities"
import { type Actor, actorValidator, getActorEmail } from "../shared/actor"
import { type Integration } from "../shared/integrations"

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
  actor: v.optional(actorValidator),
  conversationId: v.optional(v.string()),
  text: v.optional(v.string()),
  observedAt: v.optional(v.number()),
  data: v.optional(v.any()),
}

export type ObservedMessage = {
  type: string
  externalId: string
  actor?: Actor
  conversationId?: string
  text?: string
  observedAt?: number
  data?: unknown
}

export async function findActiveIntegration(
  ctx: MutationCtx,
  args: { accountId: string; integration: Integration }
) {
  const integration = await ctx.db
    .query("integrations")
    .withIndex("by_integration_and_external", (query) =>
      query.eq("integration", args.integration).eq("externalId", args.accountId)
    )
    .first()

  if (integration === null || integration.status !== "active") {
    return null
  }

  return integration
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
  }
): Promise<Doc<"messages">> {
  const messageId = await ctx.db.insert("messages", {
    tenantId: input.integration.tenantId,
    integrationId: input.integration._id,
    integration: input.integration.integration,
    type: input.message.type,
    externalId: input.message.externalId,
    actor: input.message.actor,
    conversationId: input.message.conversationId,
    text: input.message.text,
    data: input.message.data,
    observedAt: input.message.observedAt,
    createdAt: Date.now(),
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
    message: ObservedMessage
    tenantId: string
  }
) {
  return await resolveUserIdByEmail(ctx, {
    tenantId: input.tenantId,
    email: getActorEmail(input.message.actor),
  })
}
