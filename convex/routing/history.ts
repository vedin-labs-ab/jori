import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { getActorDisplayName } from "../shared/actor"
import { routingMessageText } from "./surface"

const recentConversationLimit = 16
const finalEventLimit = 5

export type RoutingConversationEntry = {
  actor: string | null
  createdAt: number
  id: string
  observedAt: number | null
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

  const messages = await recentMessages(ctx, message)
  const replies = await recentMiloReplies(ctx, message)

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

  return await routingReplyEntries(ctx, routings)
}

async function routingReplyEntries(ctx: QueryCtx, routings: Doc<"routing">[]) {
  const entries: RoutingConversationEntry[] = []

  for (const routing of routings) {
    entries.push(...(await routingEntries(ctx, routing)))
  }

  return entries
}

async function routingEntries(ctx: QueryCtx, routing: Doc<"routing">) {
  return [quickReplyEntry(routing), await finalReplyEntry(ctx, routing)].filter(
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

async function finalReplyEntry(ctx: QueryCtx, routing: Doc<"routing">) {
  if (
    routing.finalReplyMessageTs === undefined ||
    routing.runId === undefined
  ) {
    return null
  }

  const text = await readFinalReplyText(ctx, routing.runId)

  return text === undefined
    ? null
    : miloReplyEntry({
        createdAt:
          deliveryTimestampMs(routing.finalReplyMessageTs) ?? routing.updatedAt,
        id: `${routing._id}:final`,
        text,
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
    text: args.text,
    type: args.type,
  }
}

async function readFinalReplyText(ctx: QueryCtx, runId: Id<"runs">) {
  const events = await ctx.db
    .query("runtimeEvents")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .order("desc")
    .take(finalEventLimit)

  return events
    .filter((event) => event.type === "message.final")
    .map((event) => readPayloadString(event.payload, "content"))
    .find((content) => content !== undefined)
}

function readPayloadString(payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null || !(key in payload)) {
    return undefined
  }

  const value = (payload as Record<string, unknown>)[key]

  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined
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
