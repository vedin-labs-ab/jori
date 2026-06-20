import { type Doc } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { type ActorKind, getActorDisplayName } from "../shared/actor"
import { routingMessageText } from "./surface"

const recentConversationLimit = 16

export type RoutingConversationEntry = {
  actor: string | null
  createdAt: number
  id: string
  observedAt: number | null
  source: ActorKind | "unknown"
  text: string
  type: string
}

export async function recentConversation(
  ctx: QueryCtx,
  message: Doc<"messages">,
  integration: Doc<"integrations">
) {
  if (message.conversationId === undefined) {
    return [messageEntry(message, integration)]
  }

  const [messages, replies] = await Promise.all([
    recentMessages(ctx, message),
    recentMiloReplies(ctx, message),
  ])

  return mergeRecentConversation([
    ...messages.map((entry) => messageEntry(entry, integration)),
    ...replies,
  ])
}

export function messageEntry(
  message: Doc<"messages">,
  integration: Doc<"integrations">
): RoutingConversationEntry {
  return {
    actor: getActorDisplayName(message.actor) ?? null,
    createdAt: message.createdAt,
    id: message._id,
    observedAt: message.observedAt ?? null,
    source: message.actor?.kind ?? "unknown",
    text: routingMessageText(message, integration),
    type: message.type,
  }
}

export function mergeRecentConversation(entries: RoutingConversationEntry[]) {
  return [...entries]
    .sort(
      (left, right) =>
        left.createdAt - right.createdAt || left.id.localeCompare(right.id)
    )
    .slice(-recentConversationLimit)
}

async function recentMessages(ctx: QueryCtx, message: Doc<"messages">) {
  const conversationId = message.conversationId

  if (conversationId === undefined) {
    return [message]
  }

  return await ctx.db
    .query("messages")
    .withIndex("by_conversation", (query) =>
      query
        .eq("tenantId", message.tenantId)
        .eq("integrationId", message.integrationId)
        .eq("conversationId", conversationId)
    )
    .order("desc")
    .take(recentConversationLimit)
}

async function recentMiloReplies(ctx: QueryCtx, message: Doc<"messages">) {
  const conversationId = message.conversationId

  if (conversationId === undefined) {
    return []
  }

  const routings = await ctx.db
    .query("routing")
    .withIndex("by_conversation", (query) =>
      query
        .eq("tenantId", message.tenantId)
        .eq("integrationId", message.integrationId)
        .eq("conversationId", conversationId)
    )
    .order("desc")
    .take(recentConversationLimit)

  return routingReplyEntries(routings)
}

function routingReplyEntries(routings: Doc<"routing">[]) {
  const entries: RoutingConversationEntry[] = []

  for (const routing of routings) {
    entries.push(...routingEntries(routing))
  }

  return entries
}

function routingEntries(routing: Doc<"routing">) {
  return [quickReplyEntry(routing), finalReplyEntry(routing)].filter(
    isConversationEntry
  )
}

function quickReplyEntry(routing: Doc<"routing">) {
  if (routing.reply === undefined || routing.replyMessageTs === undefined) {
    return null
  }

  return miloReplyEntry({
    createdAt: deliveryTimestampMs(routing.replyMessageTs) ?? routing.updatedAt,
    id: `${routing._id}:reply`,
    text: routing.reply,
    type: "milo.reply",
  })
}

function finalReplyEntry(routing: Doc<"routing">) {
  if (
    routing.finalReplyMessageTs === undefined ||
    routing.finalReply === undefined
  ) {
    return null
  }

  return miloReplyEntry({
    createdAt:
      deliveryTimestampMs(routing.finalReplyMessageTs) ?? routing.updatedAt,
    id: `${routing._id}:final`,
    text: routing.finalReply,
    type: "milo.final_reply",
  })
}

function miloReplyEntry(args: {
  createdAt: number
  id: string
  text: string
  type: string
}): RoutingConversationEntry {
  return {
    actor: "Milo",
    createdAt: args.createdAt,
    id: args.id,
    observedAt: null,
    source: "self",
    text: args.text,
    type: args.type,
  }
}

function deliveryTimestampMs(value: string) {
  const timestamp = Number(value)

  return Number.isFinite(timestamp) ? Math.round(timestamp * 1000) : undefined
}

function isConversationEntry(
  entry: RoutingConversationEntry | null
): entry is RoutingConversationEntry {
  return entry !== null
}
