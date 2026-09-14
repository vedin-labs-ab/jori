import { paginationOptsValidator } from "convex/server"
import { type Infer, v } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx, mutation, query } from "../_generated/server"
import { checkOrganizationAccess, requireOrganizationAccess } from "../access"
import { readUserProfile } from "../access/users"
import { consoleAnswerValidator } from "../messages/console"
import { consoleAuthor } from "../messages/console/view"
import { referenceTargetValidator } from "../messages/references"
import { modelSelectionValidator } from "../model/selection"
import {
  accountArgs,
  ensureAccountPerson,
  resolveConsolePerson,
  resolveCurrentPerson,
} from "../persons/account"
import { withOwnerDisplay } from "../persons/names"
import { conversationVisibility } from "./access"
import { listConsoleConversations } from "./console/list"

export { listConsoleConversations } from "./console/list"

import { sendConsoleMessage } from "./console/send"
import { readLiveState } from "./live"
import {
  findVisibleConsoleConversation,
  requireVisibleConsoleConversation,
} from "./resolve"

export { sendConsoleMessage } from "./console/send"

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

    const personId = await resolveConsolePerson(
      ctx,
      args.organizationId,
      access.identity
    )
    const conversation = await findVisibleConsoleConversation(ctx, {
      ...args,
      personId,
    })

    if (conversation === null) {
      return { status: "not_found" as const }
    }

    return await withOwnerDisplay(ctx, {
      status: "ready" as const,
      ownerId: conversation.createdBy,
      updatedAt: conversation.updatedAt ?? conversation._creationTime,
      title: conversation.title ?? "",
      folderId: conversation.folderId,
      visibility: conversationVisibility(conversation),
      createdBy: conversation.createdBy,
      viewer:
        personId === undefined
          ? null
          : await consoleAuthor(ctx, personId, personId),
      ...(await readLiveState(ctx, conversation)),
    })
  },
})

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
