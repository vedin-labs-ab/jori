import { type PaginationOptions, paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx, query } from "../_generated/server"
import { requireVisibleConsoleConversation } from "../conversations/resolve"
import { resolveCurrentPerson } from "../persons/account"
import { type Actor } from "../shared/actor"
import { type QueryLikeCtx } from "../shared/context"
import { readDataObject, readDataString } from "../shared/data"

// Console messages: what a person types to Jori in the web console and what
// Jori writes back. They live in the same `messages` table as provider
// messages, keyed by the conversation's own id, with no integration behind
// them.

export const consoleMessageType = "console.message"

/** What a person's message was sent from, so the run it starts is filed
 *  where the person was working. */
export const consoleContextValidator = v.object({
  kind: v.literal("folder"),
  id: v.id("folders"),
})

export const reply = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
    parts: v.optional(v.array(v.any())),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    return (await insertConsoleReply(ctx, args))._id
  },
})

/** The conversation's messages, newest first, shaped for the console. */
export const page = query({
  args: {
    organizationId: v.string(),
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const conversation = await requireVisibleConsoleConversation(ctx, {
      ...args,
      personId,
    })

    return await pageConsoleMessages(ctx, conversation, args.paginationOpts)
  },
})

export async function pageConsoleMessages(
  ctx: QueryLikeCtx,
  conversation: Doc<"conversations">,
  paginationOpts: PaginationOptions
) {
  const result = await ctx.db
    .query("messages")
    .withIndex(
      "by_organization_and_integration_and_conversation_and_created_at",
      (query) =>
        query
          .eq("organizationId", conversation.organizationId)
          .eq("integrationId", undefined)
          .eq("conversationId", conversation.externalId)
    )
    .order("desc")
    .paginate(paginationOpts)

  return { ...result, page: result.page.map(consoleMessageView) }
}

/** Jori's reply into a console conversation, written as the self actor. */
export async function insertConsoleReply(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">
    parts?: unknown[]
    text: string
  }
) {
  const conversation = await ctx.db.get(args.conversationId)

  if (conversation === null || conversation.surface !== "console") {
    throw new Error("Console conversation not found.")
  }

  return await insertConsoleMessage(ctx, {
    actor: { kind: "self", externalId: "console" },
    conversation,
    data: args.parts === undefined ? undefined : { parts: args.parts },
    mentioned: false,
    now: Date.now(),
    text: args.text,
  })
}

export async function insertConsoleMessage(
  ctx: MutationCtx,
  input: {
    actor: Actor
    conversation: Doc<"conversations">
    data: unknown
    mentioned: boolean
    now: number
    text: string
  }
) {
  const messageId = await ctx.db.insert("messages", {
    organizationId: input.conversation.organizationId,
    surface: "console",
    type: consoleMessageType,
    externalId: crypto.randomUUID(),
    mentioned: input.mentioned,
    actor: input.actor,
    ...("personId" in input.actor ? { personId: input.actor.personId } : {}),
    conversationId: input.conversation.externalId,
    text: input.text,
    data: input.data,
    createdAt: input.now,
  })
  const message = await ctx.db.get(messageId)

  if (message === null) {
    throw new Error("Message insert failed.")
  }

  await ctx.db.patch(input.conversation._id, { updatedAt: input.now })

  return message
}

export function consoleMessageFolderId(data: unknown) {
  const context = readDataObject(data, "context")

  return readDataString(context, "kind") === "folder"
    ? (readDataString(context, "id") as Id<"folders"> | undefined)
    : undefined
}

function consoleMessageView(message: Doc<"messages">) {
  return {
    id: message._id,
    role:
      message.actor?.kind === "self" ? ("jori" as const) : ("person" as const),
    text: message.text ?? "",
    data: message.data,
    createdAt: message.createdAt,
  }
}
