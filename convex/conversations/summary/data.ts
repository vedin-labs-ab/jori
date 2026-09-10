import { v } from "convex/values"
import { collapseWhitespace } from "../../../contracts/text"
import { type Doc, type Id } from "../../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../../_generated/server"
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

type MessageRange =
  | {
      type: "after" | "before"
      createdAt: number
    }
  | {
      type: "all"
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
  const latest = await conversationMessages(ctx, conversation, {
    limit: summarySourceMessageLimit + 1,
    range: { type: "all" },
  })

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
    return await conversationMessages(ctx, conversation, {
      limit: summarySourceMessageLimit,
      range: { type: "all" },
    })
  }

  const newer = await conversationMessages(ctx, conversation, {
    limit: summarySourceMessageLimit,
    range: { createdAt: summarizedAt, type: "after" },
  })
  const overlapLimit = Math.min(
    summarySourceMessageLimit - newer.length,
    summaryOverlapMessageLimit
  )

  return overlapLimit <= 0
    ? newer
    : [
        ...newer,
        ...(await conversationMessages(ctx, conversation, {
          limit: overlapLimit,
          range: { createdAt: summarizedAt, type: "before" },
        })),
      ]
}

async function conversationMessages(
  ctx: QueryCtx,
  conversation: Doc<"conversations">,
  options: {
    limit: number
    range: MessageRange
  }
) {
  return await ctx.db
    .query("messages")
    .withIndex(
      "by_organization_and_integration_and_conversation_and_created_at",
      (q) => {
        const scoped = q
          .eq("organizationId", conversation.organizationId)
          .eq("integrationId", conversation.integrationId)
          .eq("conversationId", conversation.externalId)

        if (options.range.type === "after") {
          return scoped.gt("createdAt", options.range.createdAt)
        }

        if (options.range.type === "before") {
          return scoped.lt("createdAt", options.range.createdAt)
        }

        return scoped
      }
    )
    .order("desc")
    .take(options.limit)
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
