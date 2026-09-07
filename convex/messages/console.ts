import { type PaginationOptions, paginationOptsValidator } from "convex/server"
import { type Infer, v } from "convex/values"
import { type ReplyPart } from "../../contracts/replies/parts"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx, query } from "../_generated/server"
import { requireVisibleConsoleConversation } from "../conversations/resolve"
import { resolveCurrentPerson } from "../persons/account"
import { clearRunDraft } from "../runs/execution/drafts/data"
import { type Actor } from "../shared/actor"
import { type QueryLikeCtx } from "../shared/context"
import { type referenceTargetValidator } from "./references"

// Console messages: what a person types to Jori in the web console and what
// Jori writes back. They live in the same `messages` table as provider
// messages, keyed by the conversation's own id, with no integration behind
// them.

const consoleMessageType = "console.message"

/** The questions a person's message answers: the reply holding them and,
 *  for each of its choices parts, the part's index and the values chosen.
 *  Kept with the message so the console shows the questions answered. */
export const consoleAnswerValidator = v.object({
  messageId: v.id("messages"),
  answers: v.array(v.object({ part: v.number(), values: v.array(v.string()) })),
})

/** What a person's message carries besides its text, or nothing: what it
 *  was sent about, the resources its text mentions, and what it answers. */
export function consoleMessageData(input: {
  context?: Infer<typeof referenceTargetValidator>
  references?: Infer<typeof referenceTargetValidator>[]
  answer?: Infer<typeof consoleAnswerValidator>
}) {
  const data = {
    ...(input.context === undefined ? {} : { context: input.context }),
    ...(input.references === undefined || input.references.length === 0
      ? {}
      : {
          references: input.references.map(({ kind, id }) => ({ kind, id })),
        }),
    ...(input.answer === undefined ? {} : { answer: input.answer }),
  }

  return Object.keys(data).length === 0 ? undefined : data
}

// The parts arrive validated against the reply contract by the tool that
// sent them; here they are objects to store.
export const reply = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    runId: v.id("runs"),
    text: v.string(),
    parts: v.optional(v.array(v.record(v.string(), v.any()))),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const message = await insertConsoleReply(ctx, {
      ...args,
      parts: args.parts as ReplyPart[] | undefined,
    })

    return message._id
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

/** Jori's reply into a console conversation, written as the self actor. The
 *  run's draft was this reply taking shape, so the message replaces it in
 *  the same transaction. */
export async function insertConsoleReply(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">
    parts?: ReplyPart[]
    runId: Id<"runs">
    text: string
  }
) {
  const conversation = await ctx.db.get(args.conversationId)

  if (conversation === null || conversation.surface !== "console") {
    throw new Error("Console conversation not found.")
  }

  const message = await insertConsoleMessage(ctx, {
    actor: { kind: "self", externalId: "console" },
    conversation,
    data: args.parts === undefined ? undefined : { parts: args.parts },
    mentioned: false,
    now: Date.now(),
    text: args.text,
  })

  await clearRunDraft(ctx, args.runId)

  return message
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
