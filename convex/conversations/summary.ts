import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server"
import { messageText } from "../messages/surface"
import { getActorDisplayName } from "../shared/actor"
import { summaryMessageLimit } from "./limits"

export type SummaryMessage = {
  actor: string
  createdAt: number
  observedAt: number | null
  speaker: string
  text: string
}

export type PendingSummary = {
  conversationId: Id<"conversations">
  messages: SummaryMessage[]
  priorSummary: string | null
  readAt: number
}

export const pending = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args): Promise<PendingSummary | null> => {
    const conversation = await ctx.db.get(args.conversationId)

    if (conversation === null) {
      return null
    }

    const integration = await ctx.db.get(conversation.integrationId)

    if (integration === null) {
      return null
    }

    const readAt = Date.now()

    return {
      conversationId: conversation._id,
      messages: await pendingMessages(ctx, conversation, integration),
      priorSummary: conversation.summary ?? null,
      readAt,
    }
  },
})

export const commit = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    summarizedAt: v.number(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    const summary = normalizeSummary(args.summary)

    await ctx.db.patch(args.conversationId, {
      functionId: undefined,
      summarizedAt: args.summarizedAt,
      summarizeAt: undefined,
      summary: summary === "" ? undefined : summary,
    })
  },
})

export const clear = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (conversation === null) {
      return
    }

    await ctx.db.patch(conversation._id, {
      functionId: undefined,
      summarizeAt: undefined,
    })
  },
})

async function pendingMessages(
  ctx: QueryCtx,
  conversation: Doc<"conversations">,
  integration: Doc<"integrations">
) {
  const messages = await ctx.db
    .query("messages")
    .withIndex(
      "by_tenant_and_integration_and_conversation_and_created_at",
      (q) => {
        const scoped = q
          .eq("tenantId", conversation.tenantId)
          .eq("integrationId", conversation.integrationId)
          .eq("conversationId", conversation.externalId)

        return conversation.summarizedAt === undefined
          ? scoped
          : scoped.gt("createdAt", conversation.summarizedAt)
      }
    )
    .order("desc")
    .take(summaryMessageLimit)

  return messages.reverse().flatMap((message) => {
    const entry = summaryMessage(message, integration)

    return entry === null ? [] : [entry]
  })
}

function summaryMessage(
  message: Doc<"messages">,
  integration: Doc<"integrations">
): SummaryMessage | null {
  const text = messageText(message, integration).trim()

  if (text === "") {
    return null
  }

  return {
    actor: getActorDisplayName(message.actor) ?? "unknown",
    createdAt: message.createdAt,
    observedAt: message.observedAt ?? null,
    speaker: message.actor?.kind ?? "unknown",
    text,
  }
}

function normalizeSummary(value: string) {
  return value.replace(/\s+/g, " ").trim()
}
