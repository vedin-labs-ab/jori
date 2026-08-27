import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { type QueryLikeCtx } from "../../shared/context"

export async function getOrganizationAutomation(
  ctx: QueryLikeCtx,
  organizationId: string,
  automationId: Id<"automations">
) {
  const automation = await ctx.db.get(automationId)

  if (automation === null || automation.organizationId !== organizationId) {
    throw new Error("Automation not found.")
  }

  return automation
}

export async function getRequiredAutomation(
  ctx: MutationCtx,
  automationId: Id<"automations">
) {
  const automation = await ctx.db.get(automationId)

  if (automation === null) {
    throw new Error("Automation not found.")
  }

  return automation
}
