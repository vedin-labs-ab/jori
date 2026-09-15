import { v } from "convex/values"
import { collapseWhitespace } from "../../../contracts/text"
import { type Doc, type Id } from "../../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../../_generated/server"
import { mark } from "../../discovery/sync/intent"
import { conversationMessages } from "../../messages/read"
import { getActorDisplayName, getActorKind } from "../../shared/actor"
import { type MessageSurface } from "../../shared/integrations"
import {
  summaryOverlapMessageLimit,
  summarySourceMessageLimit,
} from "../limits"

export type SummaryMessage = {
  actor: string
  createdAt: number
  observedAt: number | null
  speaker: string
  text: string
}

export type PendingSummary = {
  conversationId: Id<"conversations">
  functionId: Id<"_scheduled_functions">
  messages: SummaryMessage[]
  priorSummary: string | null
  readAt: number
  surface: MessageSurface
}

export const pending = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args): Promise<PendingSummary | null> => {
    const conversation = await ctx.db.get(args.conversationId)

    if (conversation?.debounce === undefined) {
      return null
    }

    const readAt = Date.now()

    return {
      conversationId: conversation._id,
      functionId: conversation.debounce.functionId,
      messages: await loadSummaryMessages(ctx, conversation),
      priorSummary: conversation.summary ?? null,
      readAt,
      surface: conversation.surface,
    }
  },
})

export const commit = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    functionId: v.id("_scheduled_functions"),
    summarizedAt: v.number(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (conversation?.debounce?.functionId !== args.functionId) {
      return
    }

    const summary = collapseWhitespace(args.summary)

    await ctx.db.patch(args.conversationId, {
      debounce: undefined,
      summarizedAt: args.summarizedAt,
      summary: summary === "" ? undefined : summary,
    })

    if (conversation.surface === "console") {
      await mark(ctx, conversation.organizationId, conversation._id)
    }
  },
})

export const clear = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    functionId: v.id("_scheduled_functions"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (conversation?.debounce?.functionId !== args.functionId) {
      return
    }

    await ctx.db.patch(conversation._id, { debounce: undefined })
  },
})

export async function loadSummaryMessages(
  ctx: QueryCtx,
  conversation: Doc<"conversations">
) {
  const rows = await sourceMessageRows(ctx, conversation)

  return rows.reverse().flatMap((message) => {
    const entry = summaryMessage(message)

    return entry === null ? [] : [entry]
  })
}

async function sourceMessageRows(
  ctx: QueryCtx,
  conversation: Doc<"conversations">
) {
  const latest = await conversationMessages(ctx, conversation)
    .order("desc")
    .take(summarySourceMessageLimit + 1)

  return latest.length <= summarySourceMessageLimit
    ? latest
    : await incrementalMessageRows(ctx, conversation)
}

async function incrementalMessageRows(
  ctx: QueryCtx,
  conversation: Doc<"conversations">
) {
  const summarizedAt = conversation.summarizedAt

  if (summarizedAt === undefined) {
    return await conversationMessages(ctx, conversation)
      .order("desc")
      .take(summarySourceMessageLimit)
  }

  const newer = await conversationMessages(ctx, conversation, {
    createdAt: summarizedAt,
    type: "after",
  })
    .order("desc")
    .take(summarySourceMessageLimit)
  const overlapLimit = Math.min(
    summarySourceMessageLimit - newer.length,
    summaryOverlapMessageLimit
  )

  return overlapLimit <= 0
    ? newer
    : [
        ...newer,
        ...(await conversationMessages(ctx, conversation, {
          createdAt: summarizedAt,
          type: "before",
        })
          .order("desc")
          .take(overlapLimit)),
      ]
}

function summaryMessage(message: Doc<"messages">): SummaryMessage | null {
  const text = (message.text ?? "").trim()

  if (text === "") {
    return null
  }

  return {
    actor: getActorDisplayName(message.actor) ?? "unknown",
    createdAt: message.createdAt,
    observedAt: message.observedAt ?? null,
    speaker: getActorKind(message.actor),
    text,
  }
}
