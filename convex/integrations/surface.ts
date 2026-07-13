import { internal } from "../_generated/api"
import { type MutationCtx } from "../_generated/server"
import { type TransitionSubject } from "../transitions"

export async function scheduleTransitionSurfaceSync(
  ctx: MutationCtx,
  subject: TransitionSubject
) {
  switch (subject.kind) {
    case "approval":
      await ctx.scheduler.runAfter(
        0,
        internal.integrations.slack.approvals.surface.sync,
        { approvalId: subject.id }
      )
      return
    case "integrationOffer":
      await ctx.scheduler.runAfter(
        0,
        internal.integrations.slack.offers.surface.sync,
        {
          integrationOfferId: subject.id,
        }
      )
      return
  }
}
