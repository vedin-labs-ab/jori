import { type Doc, type Id } from "../_generated/dataModel"
import { conversationVisibility } from "../conversations/access"
import { type QueryLikeCtx } from "../shared/context"
import { createSight, type Sight } from "../visibility/sight"
import { runVisibleToPerson } from "./console/filters"
import { runResourceGate } from "./sight"

/** Console history follows the chat's current audience, including revocation.
 *  Provider conversations keep their existing surface-based run policy. */
export async function canSeeRun(
  ctx: QueryLikeCtx,
  run: Doc<"runs">,
  personId: Id<"persons"> | undefined,
  sight: Sight = createSight(ctx, {
    organizationId: run.organizationId,
    personId,
  })
): Promise<boolean> {
  const gate = await runResourceGate(ctx, run)
  if (gate === null) {
    return false
  }
  return gate !== undefined
    ? await sight.canSee(gate)
    : run.job === undefined && runVisibleToPerson(run, personId)
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
      ? conversationVisibility(conversation).mode !== "private"
      : run.audience === "organization"
  return filter === "organization" ? shared : !shared
}
