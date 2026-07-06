import { type MutationCtx } from "../_generated/server"
import { resolveRunAudience } from "../runs/introspect/audience"
import { createInstructionRunSnapshot } from "../runs/snapshot"
import { queueRun } from "../runtime/outbox"
import { type PlaybookPlanArgs, resolvePlaybookPlan } from "./enable"

/**
 * A one-time taste of a playbook before enabling it: the rendered
 * instructions run once as a plain instruction run, so no automation row is
 * created and nothing recurs.
 */
export async function trialPlaybook(ctx: MutationCtx, args: PlaybookPlanArgs) {
  const plan = await resolvePlaybookPlan(ctx, args)

  const runId = await ctx.db.insert("runs", {
    tenantId: args.tenantId,
    cause: { type: "manual", personId: args.createdBy },
    ...createInstructionRunSnapshot({
      instructions: plan.instructions,
      title: plan.definition.title,
    }),
    ...(await resolveRunAudience(ctx, {
      run: { createdBy: args.createdBy },
    })),
    status: "queued",
    createdBy: args.createdBy,
    createdAt: Date.now(),
  })

  await queueRun(ctx, runId)

  return { runId }
}
