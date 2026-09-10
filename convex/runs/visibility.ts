import { type Doc, type Id } from "../_generated/dataModel"
import { conversationGate } from "../conversations/access"
import { type QueryLikeCtx } from "../shared/context"
import { createSight } from "../visibility/sight"
import { runVisibleToPerson } from "./console/filters"

/** Console history follows the chat's current audience, including revocation.
 *  Provider conversations keep their existing surface-based run policy. */
export async function canSeeRun(
  ctx: QueryLikeCtx,
  run: Doc<"runs">,
  personId: Id<"persons"> | undefined
): Promise<boolean> {
  if (run.conversationId !== undefined) {
    const conversation = await ctx.db.get(run.conversationId)

    if (
      conversation === null ||
      conversation.organizationId !== run.organizationId
    ) {
      return false
    }

    if (conversation.surface === "console") {
      return await createSight(ctx, {
        organizationId: run.organizationId,
        personId,
      }).canSee(conversationGate(conversation))
    }
  }

  return runVisibleToPerson(run, personId)
}

/** The console's facet follows the chat's live personal/workspace setting. */
export async function runMatchesVisibilityFilter(
  ctx: QueryLikeCtx,
  run: Doc<"runs">,
  filter: import("./console/filters").RunAudienceFilter
) {
  if (filter === "all") {
    return true
  }
  const conversation =
    run.conversationId === undefined
      ? null
      : await ctx.db.get(run.conversationId)
  const shared =
    conversation?.surface === "console"
      ? conversationGate(conversation).visibility.mode !== "private"
      : run.audience === "organization"
  return filter === "organization" ? shared : !shared
}
