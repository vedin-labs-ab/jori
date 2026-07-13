import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { releaseSubscription } from "../subscriptions/data"
import { deleteOwnedAutomations } from "./children"
import { getTenantAutomation } from "./read"
import { cancelTrigger } from "./trigger"

export async function removeAutomation(
  ctx: MutationCtx,
  args: {
    tenantId: string
    automationId: Id<"automations">
  }
) {
  const automation = await getTenantAutomation(
    ctx,
    args.tenantId,
    args.automationId
  )

  await cancelTrigger(ctx, automation.trigger)
  if (automation.type === "event" && "integrationId" in automation.trigger) {
    await releaseSubscription(ctx, {
      tenantId: automation.tenantId,
      trigger: automation.trigger,
      exceptAutomationId: automation._id,
    })
  }
  await ctx.db.delete(args.automationId)
  await deleteOwnedAutomations(ctx, automation._id)

  return { deleted: true, automationId: args.automationId }
}
