import { type MutationCtx } from "../_generated/server"
import { resolveAccessInput } from "../automations/access"
import { createInstructionRun } from "../runs/instruction"
import { type PlaybookPlanArgs, resolvePlaybookPlan } from "./enable"

/**
 * A one-time taste of a playbook before enabling it: the rendered
 * instructions run once as an instruction run carrying the playbook's tool
 * contract, so no automation row is created and nothing recurs.
 */
export async function trialPlaybook(ctx: MutationCtx, args: PlaybookPlanArgs) {
  const plan = await resolvePlaybookPlan(ctx, args)

  const runId = await createInstructionRun(ctx, {
    tenantId: args.tenantId,
    instructions: plan.instructions,
    title: plan.definition.title,
    access: await resolveAccessInput(ctx, {
      access: plan.access,
      createdBy: args.createdBy,
      tenantId: args.tenantId,
    }),
    createdBy: args.createdBy,
  })

  return { runId }
}
