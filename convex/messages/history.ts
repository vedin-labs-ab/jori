import { readMessageContext } from "../../contracts/replies/answers"
import { type Doc } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { findMessageConversation } from "../conversations/resolve"
import { reactionSummariesForMessages } from "../reactions/summary"
import {
  type ActorKind,
  getActorDisplayName,
  getActorKind,
} from "../shared/actor"
import { createSight } from "../visibility/sight"
import { messageActorIds, messageIdentifiers } from "./identifiers"
import {
  consoleContextLine,
  consoleReferenceLine,
  resolveConsoleContext,
  resolveConsoleReferences,
} from "./references"

const recentConversationLimit = 16

export type ConversationEntry = {
  actor: string | null
  actorIds: string[]
  /** What a console message was sent about and what its text mentions,
   *  as a line each for the model. */
  context: string | null
  createdAt: number
  id: string
  identifiers: string[]
  observedAt: number | null
  reactions: string | null
  source: ActorKind | "unknown"
  text: string
  type: string
}

export type RecentConversation = {
  entries: ConversationEntry[]
  hasMoreMessages: boolean
  /** The conversation's rolling summary, standing in for the messages the
   *  recent window no longer holds. */
  summary: string | null
}

export async function recentConversation(
  ctx: QueryCtx,
  message: Doc<"messages">
): Promise<RecentConversation> {
  const messages = await recentMessages(ctx, message)
  const reactions = await reactionSummariesForMessages(ctx, messages)
  const entries = await Promise.all(
    messages.map(async (entry) =>
      messageEntry(
        entry,
        reactions.get(entry._id),
        await messageContextLine(ctx, entry)
      )
    )
  )

  const conversation = await findMessageConversation(ctx, message)

  return {
    entries: mergeRecentConversation(entries),
    hasMoreMessages: messages.length > recentConversationLimit,
    summary: conversation?.summary ?? null,
  }
}

export function messageEntry(
  message: Doc<"messages">,
  reactions?: string,
  context?: string
): ConversationEntry {
  return {
    actor: getActorDisplayName(message.actor) ?? null,
    actorIds: messageActorIds(message),
    context: context ?? null,
    createdAt: message.createdAt,
    id: message._id,
    identifiers: messageIdentifiers(message),
    observedAt: message.observedAt ?? null,
    reactions: reactions ?? null,
    source: getActorKind(message.actor),
    text: message.text ?? "",
    type: message.type,
  }
}

export function mergeRecentConversation(entries: ConversationEntry[]) {
  return [...entries]
    .sort(
      (left, right) =>
        left.createdAt - right.createdAt || left.id.localeCompare(right.id)
    )
    .slice(-recentConversationLimit)
}

/** The lines a console message's context and mentions make, read as the
 *  person who sent it sees the targets; nothing for a message sent about
 *  nothing that mentions nothing. */
async function messageContextLine(ctx: QueryCtx, message: Doc<"messages">) {
  if (message.surface !== "console") {
    return undefined
  }

  const context = readMessageContext(message.data)
  const sight = createSight(ctx, {
    organizationId: message.organizationId,
    personId: message.personId,
  })
  const lines = [
    ...(context === undefined
      ? []
      : [
          consoleContextLine(
            context,
            await resolveConsoleContext(ctx, sight, message.data)
          ),
        ]),
    ...(await resolveConsoleReferences(ctx, sight, message.data)).map(
      consoleReferenceLine
    ),
  ]

  return lines.length === 0 ? undefined : lines.join("\n")
}

async function recentMessages(ctx: QueryCtx, message: Doc<"messages">) {
  return await ctx.db
    .query("messages")
    .withIndex(
      "by_organization_and_integration_and_conversation_and_created_at",
      (query) =>
        query
          .eq("organizationId", message.organizationId)
          .eq("integrationId", message.integrationId)
          .eq("conversationId", message.conversationId)
    )
    .order("desc")
    .take(recentConversationLimit + 1)
}
