import { type Doc, type Id } from "../../_generated/dataModel"
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

export async function listAppAutomationRoots(
  ctx: QueryLikeCtx,
  appId: Id<"apps">,
  limit: number
): Promise<Doc<"automations">[]> {
  return await ctx.db
    .query("automations")
    .withIndex("by_app_and_parent", (index) =>
      index.eq("appId", appId).eq("parentId", undefined)
    )
    .take(limit)
}
