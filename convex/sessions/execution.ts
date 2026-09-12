import { v } from "convex/values"
import { isTerminalRunStatus } from "../../contracts/runtime/runs"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { resetConversationExecution } from "../conversations/execution/sharing"
import { stopRunTree } from "../runs/tree"
import { findSession } from "./data"
import { runExecutionIsCurrent, sessionExecutionIsCurrent } from "./scope"

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
