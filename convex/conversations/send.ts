import { type Infer } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import {
  type consoleAnswerValidator,
  consoleMessageData,
  insertConsoleMessage,
} from "../messages/console"
import { type referenceTargetValidator } from "../messages/references"
import { type modelSelectionValidator } from "../model/selection"
import { nameMentions } from "../references/tokens"
import { executionPrincipalPersonId } from "../runs/principal"
import { createPersonActor } from "../shared/actor"
import { createSight } from "../visibility/sight"
import {
  createConsoleConversation,
  normalizeConsoleContext,
  normalizeConsoleReferences,
} from "./create"
import { startMessageRun } from "./data"
import { conversationExecutionPrincipal } from "./execution"
import { requireVisibleConsoleConversation } from "./resolve"
import { scheduleConversationSummary } from "./summary/schedule"

export type ConsoleSendArgs = {
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
  const conversation =
    existing ??
    (await createConsoleConversation(ctx, {
      ...args,
      text: nameMentions(text, references),
      now,
    }))
  await normalizeConsoleReferences(
    ctx,
    createSight(ctx, {
      organizationId: args.organizationId,
      personId: executionPrincipalPersonId(
        conversationExecutionPrincipal(conversation)
      ),
    }),
    references
  )
  return { conversation, context, references }
}
