import { resolvePlaybookSchedule } from "../../contracts/playbooks/catalog"
import { playbookCron } from "../../contracts/playbooks/schedule"
import { type Id } from "../_generated/dataModel"
import { resolveAccessInput } from "../automations/access"
import { toAutomationDisplay } from "../automations/display"
import { getTimeTrigger } from "../automations/timing"
import { requirePersonTimezone } from "../persons/profile/timezone"
import { executionPrincipalForScope } from "../runs/principal"
import { type QueryLikeCtx } from "../shared/context"
import { playbookBinding } from "./enable"
import { type PlaybookPlanArgs, resolvePlaybookPlan } from "./plan"

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
  const principal = executionPrincipalForScope(
    plan.definition.scope,
    args.createdBy
  )
  const access = await resolveAccessInput(ctx, {
    access: plan.access,
    principal,
    organizationId: args.organizationId,
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

  return await toAutomationDisplay(ctx, {
    _id: "draft" as Id<"automations">,
    _creationTime: now,
    organizationId: args.organizationId,
    key: `playbook:${plan.definition.key}`,
    playbook: playbookBinding(plan, args),
    name: plan.definition.title,
    instructions: plan.instructions,
    scope: plan.definition.scope,
    principal,
    type: "cron",
    access,
    trigger,
    status: "active",
    createdBy: args.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}
