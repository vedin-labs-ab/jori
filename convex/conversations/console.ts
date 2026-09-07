import { type PaginationOptions, paginationOptsValidator } from "convex/server"
import { type Infer, v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx, mutation, query } from "../_generated/server"
import { checkOrganizationAccess, requireOrganizationAccess } from "../access"
import { readUserProfile } from "../access/users"
import {
  consoleAnswerValidator,
  consoleMessageData,
  insertConsoleMessage,
} from "../messages/console"
import { referenceTargetValidator } from "../messages/references"
import { modelSelectionValidator } from "../model/selection"
import {
  accountArgs,
  ensureAccountPerson,
  resolveConsolePerson,
  resolveCurrentPerson,
} from "../persons/account"
import { nameMentions } from "../references/tokens"
import { createPersonActor } from "../shared/actor"
import { type QueryLikeCtx } from "../shared/context"
import { createSight } from "../visibility/sight"
import {
  createConsoleConversation,
  normalizeConsoleContext,
  normalizeConsoleReferences,
} from "./create"
import { startMessageRun } from "./data"
import { readLiveState } from "./live"
import {
  findVisibleConsoleConversation,
  requireVisibleConsoleConversation,
} from "./resolve"
import { scheduleConversationSummary } from "./summary/schedule"

type ConsoleSendArgs = {
  organizationId: string
  personId: Id<"persons">
  profile: { name?: string; email?: string }
  conversationId?: Id<"conversations">
  text: string
  context?: Infer<typeof referenceTargetValidator>
  /** The resources the text mentions, as `+[kind:id]` tokens in it. */
  references?: Infer<typeof referenceTargetValidator>[]
  answer?: Infer<typeof consoleAnswerValidator>
  model?: Infer<typeof modelSelectionValidator>
}

/** A person's message to Jori from the console. The first message opens the
 *  conversation, with the model selection it was sent under; every message
 *  is recorded, then handed to the same run start Slack mentions use, so a
 *  blocked budget keeps the message. The resources it mentions must be
 *  ones the person can see, or the message is refused. */
export const send = mutation({
  args: {
    organizationId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    text: v.string(),
    context: v.optional(referenceTargetValidator),
    references: v.optional(v.array(referenceTargetValidator)),
    answer: v.optional(consoleAnswerValidator),
    model: v.optional(modelSelectionValidator),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const personId = await ensureAccountPerson(
      ctx,
      accountArgs(identity, args.organizationId)
    )

    return await sendConsoleMessage(ctx, {
      ...args,
      personId,
      profile: readUserProfile(identity),
    })
  },
})

/** The model and effort the conversation's next run uses. A run already
 *  answering keeps the selection it started on. */
export const choose = mutation({
  args: {
    organizationId: v.string(),
    conversationId: v.id("conversations"),
    model: modelSelectionValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)

    await chooseConversationModel(ctx, { ...args, personId })

    return null
  },
})

/** The current person's console conversations, most recently active first. */
export const list = query({
  args: {
    organizationId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)

    return await listConsoleConversations(ctx, { ...args, personId })
  },
})

/** The conversation's title, the run currently attached to its session,
 *  if any, the reply that run is composing, how much of the model's
 *  window the thread's latest run is using, and the selection its next
 *  run will use. */
export const live = query({
  args: {
    organizationId: v.string(),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return { status: "unauthorized" as const, message: access.message }
    }

    const conversation = await findVisibleConsoleConversation(ctx, {
      ...args,
      personId: await resolveConsolePerson(
        ctx,
        args.organizationId,
        access.identity
      ),
    })

    if (conversation === null) {
      return { status: "not_found" as const }
    }

    return {
      status: "ready" as const,
      title: conversation.title ?? "",
      ...(await readLiveState(ctx, conversation)),
    }
  },
})

export async function sendConsoleMessage(
  ctx: MutationCtx,
  args: ConsoleSendArgs
) {
  const text = args.text.trim()

  if (text === "") {
    throw new Error("Message text cannot be empty.")
  }

  const context =
    args.context === undefined
      ? undefined
      : normalizeConsoleContext(ctx, args.context)

  if (context === null) {
    throw new Error(`Context id is not a ${args.context?.kind}.`)
  }

  const references = await normalizeConsoleReferences(
    ctx,
    createSight(ctx, {
      organizationId: args.organizationId,
      personId: args.personId,
    }),
    args.references ?? []
  )
  const now = Date.now()
  const conversation =
    args.conversationId === undefined
      ? await createConsoleConversation(ctx, {
          ...args,
          text: nameMentions(text, references),
          now,
        })
      : await requireVisibleConsoleConversation(ctx, {
          conversationId: args.conversationId,
          organizationId: args.organizationId,
          personId: args.personId,
        })
  const message = await insertConsoleMessage(ctx, {
    actor: createPersonActor(args.personId, args.profile),
    conversation,
    data: consoleMessageData({ ...args, context, references }),
    mentioned: true,
    now,
    text,
  })
  const run = await startMessageRun(ctx, {
    conversation,
    integration: null,
    message,
    createdBy: args.personId,
    externalId: conversation.externalId,
    now,
  })

  // The summary is what the next run in this thread reads of the messages
  // the recent window no longer holds, so every message that runs is one
  // it should fold in.
  if (run.status !== "blocked") {
    await scheduleConversationSummary(ctx, conversation, now)
  }

  return {
    conversationId: conversation._id,
    messageId: message._id,
    status: run.status,
  }
}

export async function chooseConversationModel(
  ctx: MutationCtx,
  args: {
    organizationId: string
    conversationId: Id<"conversations">
    personId: Id<"persons">
    model: Infer<typeof modelSelectionValidator>
  }
) {
  const conversation = await requireVisibleConsoleConversation(ctx, args)

  await ctx.db.patch(conversation._id, { model: args.model })
}

export async function listConsoleConversations(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    paginationOpts: PaginationOptions
    personId: Id<"persons">
  }
) {
  const result = await ctx.db
    .query("conversations")
    .withIndex("by_organization_and_created_by_and_updated_at", (query) =>
      query
        .eq("organizationId", args.organizationId)
        .eq("createdBy", args.personId)
    )
    .order("desc")
    .paginate(args.paginationOpts)

  return { ...result, page: result.page.map(conversationView) }
}

function conversationView(conversation: Doc<"conversations">) {
  return {
    id: conversation._id,
    title: conversation.title ?? "",
    updatedAt: conversation.updatedAt ?? conversation._creationTime,
  }
}
