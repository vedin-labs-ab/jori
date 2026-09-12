import { type Doc } from "../_generated/dataModel"
import { conversationExecutionScope } from "../conversations/execution/principal"
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
