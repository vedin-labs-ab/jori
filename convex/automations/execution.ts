import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { sameAutomationPrincipal } from "./lifecycle/children"

/**
 * Automation runs keep an immutable configuration generation. Tool access is
 * valid only while the durable automation that owns that generation remains
 * current. Parent-owned one-time runs validate against their durable parent;
 * standalone one-time runs validate against their own retained history row.
 */
export async function canExecuteAutomationRunTools(
  ctx: QueryLikeCtx,
  run: Doc<"runs">
) {
  if (run.status !== "running") {
    return false
  }

  const snapshot = await resolveAutomationRunSnapshot(ctx, run)

  if (snapshot === null) {
    return true
  }

  const automationId = snapshot.automationParentId ?? snapshot.automationId
  const automation = await ctx.db.get(automationId)

  if (
    automation === null ||
    automation.parentId !== undefined ||
    automation.organizationId !== run.organizationId ||
    !sameAutomationPrincipal(automation.principal, run.principal) ||
    snapshot.automationConfigurationVersion === undefined ||
    (automation.configurationVersion ?? 1) !==
      snapshot.automationConfigurationVersion
  ) {
    return false
  }

  return isExecutableOwner(automation, snapshot)
}

async function resolveAutomationRunSnapshot(
  ctx: QueryLikeCtx,
  run: Doc<"runs">
): Promise<AutomationRunSnapshot | null> {
  if (run.automationId !== undefined) {
    return { ...run, automationId: run.automationId }
  }

  const rootRunId = run.rootId ?? run.parentId

  if (rootRunId === undefined) {
    return null
  }

  const root = await ctx.db.get(rootRunId)

  return root?.automationId === undefined
    ? null
    : { ...root, automationId: root.automationId }
}

type AutomationRunSnapshot = Doc<"runs"> & {
  automationId: Id<"automations">
}

function isExecutableOwner(
  automation: Doc<"automations">,
  snapshot: Pick<Doc<"runs">, "automationId" | "automationParentId">
) {
  if (automation.type !== "once") {
    return automation.status === "active"
  }

  return (
    snapshot.automationParentId === undefined &&
    snapshot.automationId === automation._id &&
    (automation.status === "active" || automation.status === "completed")
  )
}
