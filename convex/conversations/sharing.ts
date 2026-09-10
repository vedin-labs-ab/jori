import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { executesAsOrganization } from "../runs/principal"
import { stopRunTree } from "../runs/tree"
import { findSession } from "../sessions/data"
import { createPersonActor } from "../shared/actor"
import { type StoredVisibility } from "../visibility/schema"
import { conversationVisibility } from "./access"

/** Membership changes preserve the transcript. A different execution identity
 * starts a fresh session so personal context and sandboxes cannot carry over. */
export async function transitionConversationVisibility(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
  visibility: StoredVisibility,
  actorId: Id<"persons">
) {
  const changesPrincipal =
    executesAsOrganization(conversationVisibility(conversation)) !==
    executesAsOrganization(visibility)

  if (changesPrincipal) {
    await resetConversationSession(ctx, conversation, actorId)
  }

  await ctx.db.patch(conversation._id, {
    visibility,
    scope: visibility.mode === "private" ? "person" : "conversation",
    ...(changesPrincipal
      ? { summary: undefined, summarizedAt: undefined, debounce: undefined }
      : {}),
  })
}

async function resetConversationSession(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
  actorId: Id<"persons">
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
}
