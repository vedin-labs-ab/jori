import { resolvePlaybookSchedule } from "../../contracts/playbooks/catalog"
import { playbookCron } from "../../contracts/playbooks/schedule"
import { type Id } from "../_generated/dataModel"
import { resolveAccessInput } from "../automations/access"
import { toConsoleAutomation } from "../automations/console"
import { getTimeTrigger } from "../automations/timing"
import { requirePersonTimezone } from "../persons/profile/timezone"
import { type QueryLikeCtx } from "../shared/context"
import { type PlaybookPlanArgs, resolvePlaybookPlan } from "./enable"

/**
 * Resolve a playbook to the console automation shape without persisting it —
 * the prefill the raw automations builder opens from "Advanced settings".
 * Playbooks are a shortcut to an automation; this exposes the automation.
 */
export async function resolvePlaybookDraft(
  ctx: QueryLikeCtx,
  args: PlaybookPlanArgs
) {
  const plan = await resolvePlaybookPlan(ctx, args)
  const access = await resolveAccessInput(ctx, {
    access: plan.access,
    createdBy: args.createdBy,
    tenantId: args.tenantId,
  })
  const now = Date.now()
  const timezone = await requirePersonTimezone(ctx, args.createdBy)
  const trigger = getTimeTrigger(
    {
      type: "cron",
      expression: playbookCron(
        resolvePlaybookSchedule(plan.definition, plan.options)
      ),
      timezone,
    },
    now
  )

  return await toConsoleAutomation(ctx, {
    _id: "draft" as Id<"automations">,
    _creationTime: now,
    tenantId: args.tenantId,
    key: `playbook:${plan.definition.key}`,
    playbook: plan.definition.key,
    artifactId: args.artifactId,
    name: plan.definition.title,
    instructions: plan.instructions,
    scope: plan.definition.scope,
    type: "cron",
    access,
    trigger,
    status: "active",
    createdBy: args.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}
