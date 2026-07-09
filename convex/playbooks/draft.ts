import { playbookCron } from "../../contracts/playbooks/schedule"
import { type Id } from "../_generated/dataModel"
import { resolveAccessInput } from "../automations/access"
import { toConsoleAutomation } from "../automations/console"
import { getTimeTrigger } from "../automations/timing"
import { type QueryLikeCtx } from "../shared/context"
import { type PlaybookPlanArgs, resolvePlaybookPlan } from "./enable"

/**
 * Resolve a playbook to the console automation shape without persisting it —
 * the prefill the raw automations builder opens from "Advanced settings".
 * Playbooks are a shortcut to an automation; this exposes the automation.
 */
export async function resolvePlaybookDraft(
  ctx: QueryLikeCtx,
  args: PlaybookPlanArgs & { utcOffsetMinutes: number }
) {
  const plan = await resolvePlaybookPlan(ctx, args)
  const access = await resolveAccessInput(ctx, {
    access: plan.access,
    createdBy: args.createdBy,
    tenantId: args.tenantId,
  })
  const now = Date.now()
  const trigger = getTimeTrigger(
    {
      type: "cron",
      expression: playbookCron(plan.definition.schedule, args.utcOffsetMinutes),
    },
    now
  )

  return await toConsoleAutomation(ctx, {
    _id: "draft" as Id<"automations">,
    _creationTime: now,
    tenantId: args.tenantId,
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
