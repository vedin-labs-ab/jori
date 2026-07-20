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

export async function listArtifactAutomationRoots(
  ctx: QueryLikeCtx,
  artifactId: Id<"artifacts">,
  limit: number
): Promise<Doc<"automations">[]> {
  return await ctx.db
    .query("automations")
    .withIndex("by_artifact_and_parent", (index) =>
      index.eq("artifactId", artifactId).eq("parentId", undefined)
    )
    .take(limit)
}
