import { type Doc } from "../_generated/dataModel"
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

  const automationId = snapshot.automation.parentId ?? snapshot.automation.id
  const automation = await ctx.db.get(automationId)

  if (
    automation === null ||
    automation.parent !== undefined ||
    automation.organizationId !== run.organizationId ||
    !sameAutomationPrincipal(automation.principal, run.principal) ||
    snapshot.automation.version === undefined ||
    (automation.version ?? 1) !== snapshot.automation.version
  ) {
    return false
  }

  return isExecutableOwner(automation, snapshot)
}

async function resolveAutomationRunSnapshot(
  ctx: QueryLikeCtx,
  run: Doc<"runs">
): Promise<AutomationRunSnapshot | null> {
  if (run.automation !== undefined) {
    return { ...run, automation: run.automation }
  }

  const rootRunId = run.rootId ?? run.parentId

  if (rootRunId === undefined) {
    return null
  }

  const root = await ctx.db.get(rootRunId)

  return root?.automation === undefined
    ? null
    : { ...root, automation: root.automation }
}

type AutomationRunSnapshot = Doc<"runs"> & {
  automation: NonNullable<Doc<"runs">["automation"]>
}

function isExecutableOwner(
  automation: Doc<"automations">,
  snapshot: AutomationRunSnapshot
) {
  if (automation.type !== "once") {
    return automation.status === "active"
  }

  return (
    snapshot.automation.parentId === undefined &&
    snapshot.automation.id === automation._id &&
    (automation.status === "active" || automation.status === "completed")
  )
}
