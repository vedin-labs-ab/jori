import { type MutationCtx } from "../_generated/server"
import { resolveAccessInput } from "../automations/access"
import { createInstructionRun } from "../runs/instruction"
import { executionPrincipalForScope } from "../runs/principal"
import { type PlaybookPlanArgs, resolvePlaybookPlan } from "./plan"

/**
 * A one-time taste of a playbook before enabling it: the rendered
 * instructions run once as an instruction run carrying the playbook's tool
 * contract, so no automation row is created and nothing recurs.
 */
export async function trialPlaybook(ctx: MutationCtx, args: PlaybookPlanArgs) {
  const plan = await resolvePlaybookPlan(ctx, args)
  const principal = executionPrincipalForScope(
    plan.definition.scope,
    args.createdBy
  )

  const runId = await createInstructionRun(ctx, {
    organizationId: args.organizationId,
    instructions: plan.instructions,
    title: plan.definition.title,
    artifactId: args.artifactId,
    access: await resolveAccessInput(ctx, {
      access: plan.access,
      principal,
      organizationId: args.organizationId,
    }),
    createdBy: args.createdBy,
    principal,
    trial: true,
  })

  return { runId }
}
