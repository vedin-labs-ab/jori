import { type ReplyPart } from "../../../contracts/replies/parts"
import { isTerminalRunStatus } from "../../../contracts/runtime/runs"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { clearRunDraft } from "../../runs/execution/drafts/data"
import { findSession } from "../../sessions/data"
import { runExecutionIsCurrent } from "../../sessions/scope"
import { type Actor } from "../../shared/actor"
import { insertRow } from "../../shared/context"

const consoleMessageType = "console.message"

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

  const [run, session] = await Promise.all([
    ctx.db.get(args.runId),
    findSession(ctx, conversation._id),
  ])

  if (
    run === null ||
    isTerminalRunStatus(run.status) ||
    session?.runId !== args.runId ||
    !(await runExecutionIsCurrent(ctx, run))
  ) {
    throw new Error("This run is no longer active in the conversation.")
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
  const message = await insertRow(ctx, "messages", {
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

  await ctx.db.patch(input.conversation._id, { updatedAt: input.now })

  return message
}
