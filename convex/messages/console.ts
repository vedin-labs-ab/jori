import { type PaginationOptions, paginationOptsValidator } from "convex/server"
import { type Infer, v } from "convex/values"
import { type ReplyPart } from "../../contracts/replies/parts"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, query } from "../_generated/server"
import { requireVisibleConsoleConversation } from "../conversations/resolve"
import { resolveCurrentPerson } from "../persons/account"
import { type QueryLikeCtx } from "../shared/context"
import { insertConsoleReply } from "./console/records"
import { consoleMessageViews } from "./console/view"
import { conversationMessages } from "./read"
import { type referenceTargetValidator } from "./references"

// Console messages: what a person types to Jori in the web console and what
// Jori writes back. They live in the same `messages` table as provider
// messages, keyed by the conversation's own id, with no integration behind
// them.

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

    return await pageConsoleMessages(
      ctx,
      conversation,
      args.paginationOpts,
      personId
    )
  },
})

export async function pageConsoleMessages(
  ctx: QueryLikeCtx,
  conversation: Doc<"conversations">,
  paginationOpts: PaginationOptions,
  viewerId?: Id<"persons">
) {
  const result = await conversationMessages(ctx, {
    ...conversation,
    integrationId: undefined,
  })
    .order("desc")
    .paginate(paginationOpts)

  return {
    ...result,
    page: await consoleMessageViews(ctx, result.page, viewerId),
  }
}
