import { v } from "convex/values"
import { isTerminalRunStatus } from "../../contracts/runtime/runs"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { conversationExecutionScope } from "../conversations/execution"
import { resetConversationExecution } from "../conversations/sharing"
import { stopRunTree } from "../runs/tree"
import { type QueryLikeCtx } from "../shared/context"
import { findSession } from "./data"

/** A context is reusable only for the audience that originally populated it. */
export async function sessionExecutionIsCurrent(
  ctx: QueryLikeCtx,
  session: Doc<"sessions">,
  conversation: Doc<"conversations">
) {
  return (
    session.executionScope ===
    (await conversationExecutionScope(ctx, conversation))
  )
}

export async function currentConversationSession(
  ctx: MutationCtx,
  conversation: Doc<"conversations">
) {
  const session = await findSession(ctx, conversation._id)
  if (
    session === null ||
    (await sessionExecutionIsCurrent(ctx, session, conversation))
  ) {
    return session
  }
  await resetConversationExecution(ctx, conversation)
  return null
}

/** Children share the root session's audience and cannot outlive its scope. */
export async function runExecutionIsCurrent(
  ctx: QueryLikeCtx,
  run: Doc<"runs">
) {
  if (run.conversationId === undefined) {
    return true
  }
  const conversation = await ctx.db.get(run.conversationId)
  if (conversation === null) {
    return false
  }
  if (conversation.surface !== "console") {
    return true
  }
  const session = await findSession(ctx, conversation._id)
  return (
    session !== null &&
    session.runId === (run.rootId ?? run._id) &&
    (await sessionExecutionIsCurrent(ctx, session, conversation))
  )
}

export async function reconcileRunExecution(
  ctx: MutationCtx,
  run: Doc<"runs">
) {
  if (
    isTerminalRunStatus(run.status) ||
    (await runExecutionIsCurrent(ctx, run))
  ) {
    return
  }
  const conversation =
    run.conversationId === undefined
      ? null
      : await ctx.db.get(run.conversationId)
  const session =
    conversation === null ? null : await findSession(ctx, conversation._id)
  if (conversation !== null && session?.runId === (run.rootId ?? run._id)) {
    await resetConversationExecution(ctx, conversation)
  } else {
    await stopRunTree(ctx, run)
  }
}

export const reconcile = internalMutation({
  args: { runId: v.id("runs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    if (run !== null) {
      await reconcileRunExecution(ctx, run)
    }
    return null
  },
})
