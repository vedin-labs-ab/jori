import { type Infer } from "convex/values"
import { nameMentions } from "../../../contracts/replies/tokens"
import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import {
  type consoleAnswerValidator,
  consoleMessageData,
} from "../../messages/console"
import { insertConsoleMessage } from "../../messages/console/records"
import { type referenceTargetValidator } from "../../messages/references"
import { type modelSelectionValidator } from "../../model/selection"
import { createPersonActor } from "../../shared/actor"
import { createSight } from "../../visibility/sight"
import { createConversationSight } from "../access"
import { startMessageRun } from "../execution/index"
import { requireVisibleConsoleConversation } from "../resolve"
import { scheduleConversationSummary } from "../summary/schedule"
import { createConsoleConversation, normalizeConsoleReferences } from "./create"

export type ConsoleSendArgs = {
  organizationId: string
  personId: Id<"persons">
  profile: { name?: string; email?: string }
  conversationId?: Id<"conversations">
  text: string
  /** Used only when creating a chat; existing chats move through filing. */
  folderId?: Id<"folders">
  /** The resources the text mentions, as `+[kind:id]` tokens in it. */
  references?: Infer<typeof referenceTargetValidator>[]
  answer?: Infer<typeof consoleAnswerValidator>
  model?: Infer<typeof modelSelectionValidator>
}

export async function sendConsoleMessage(
  ctx: MutationCtx,
  args: ConsoleSendArgs
) {
  const text = args.text.trim()

  if (text === "") {
    throw new Error("Message text cannot be empty.")
  }

  const now = Date.now()
  const { conversation, context, references } = await prepareMessage(
    ctx,
    args,
    text,
    now
  )
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

async function prepareMessage(
  ctx: MutationCtx,
  args: ConsoleSendArgs,
  text: string,
  now: number
) {
  const existing =
    args.conversationId === undefined
      ? null
      : await requireVisibleConsoleConversation(ctx, {
          conversationId: args.conversationId,
          organizationId: args.organizationId,
          personId: args.personId,
        })
  if (existing !== null && args.folderId !== undefined) {
    throw new Error("Move an existing chat using its folder controls.")
  }

  const references = await normalizeConsoleReferences(
    ctx,
    createSight(ctx, {
      organizationId: args.organizationId,
      personId: args.personId,
    }),
    args.references ?? []
  )
  const conversation =
    existing ??
    (await createConsoleConversation(ctx, {
      ...args,
      text: nameMentions(text, references),
      now,
    }))
  await normalizeConsoleReferences(
    ctx,
    createConversationSight(ctx, conversation),
    references
  )
  const context =
    conversation.folderId === undefined
      ? undefined
      : { kind: "folder" as const, id: conversation.folderId }
  return { conversation, context, references }
}
