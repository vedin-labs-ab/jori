import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { createSight, type Sight } from "../visibility/sight"
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

/**
 * The console shows organization runs to everyone; person and conversation
 * runs only to their creator. Ownerless rows stay open.
 */
export function runVisibleToPerson(
  run: Doc<"runs">,
  personId: Id<"persons"> | undefined
) {
  return (
    run.audience === "organization" ||
    run.createdBy === undefined ||
    run.createdBy === personId
  )
}
