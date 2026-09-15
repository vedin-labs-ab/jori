import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { mark } from "../../discovery/sync/intent"
import { stopRunTree } from "../../runs/tree"
import { findSession } from "../../sessions/read"
import { createPersonActor } from "../../shared/actor"
import { type StoredVisibility } from "../../visibility/schema"
import { conversationVisibility } from "../access"

/** Sharing preserves the transcript. Audience changes start a fresh session
 * so cached context and sandboxes stay with the audience that produced them. */
export async function transitionConversationVisibility(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
  visibility: StoredVisibility,
  actorId: Id<"persons">
) {
  const changesScope =
    JSON.stringify(conversationVisibility(conversation)) !==
    JSON.stringify(visibility)

  if (changesScope) {
    await resetConversationExecution(ctx, conversation, actorId)
  }

  await ctx.db.patch(conversation._id, {
    visibility,
    scope: visibility.mode === "private" ? "person" : "conversation",
  })
  await mark(ctx, conversation.organizationId, conversation._id)
}

export async function resetConversationExecution(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
  actorId?: Id<"persons">
) {
  const session = await findSession(ctx, conversation._id)

  if (session !== null) {
    const run =
      session.runId === undefined ? null : await ctx.db.get(session.runId)

    if (run !== null) {
      await stopRunTree(ctx, run, createPersonActor(actorId))
    }

    await ctx.db.delete(session._id)
  }

  if (conversation.debounce !== undefined) {
    await ctx.scheduler.cancel(conversation.debounce.functionId)
  }
  await ctx.db.patch(conversation._id, {
    summary: undefined,
    summarizedAt: undefined,
    debounce: undefined,
  })
}
