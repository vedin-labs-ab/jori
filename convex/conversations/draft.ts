import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { query } from "../_generated/server"
import { resolveCurrentPerson } from "../persons/account"
import { readRunDraft } from "../runs/execution/drafts/data"
import { findSession } from "../sessions/data"
import { sessionExecutionIsCurrent } from "../sessions/scope"
import { type QueryLikeCtx } from "../shared/context"
import { findVisibleConsoleConversation } from "./resolve"

/** The reply the conversation's live run is writing — the reasoning
 *  while the model thinks, then the text — or nothing while no run is
 *  attached to the session or it has said nothing yet. Read on its own,
 *  apart from the run's state in `console.live`, so the writes that land
 *  every few hundred milliseconds re-render the turn being written and
 *  nothing else. */
export const get = query({
  args: {
    organizationId: v.string(),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await findVisibleConsoleConversation(ctx, {
      ...args,
      personId: await resolveCurrentPerson(ctx, args.organizationId),
    })

    return conversation === null
      ? null
      : await readConversationDraft(ctx, conversation)
  },
})

export async function readConversationDraft(
  ctx: QueryLikeCtx,
  conversation: Doc<"conversations">
) {
  const session = await findSession(ctx, conversation._id)

  return session?.runId === undefined ||
    !(await sessionExecutionIsCurrent(ctx, session, conversation))
    ? null
    : await readRunDraft(ctx, session.runId)
}
