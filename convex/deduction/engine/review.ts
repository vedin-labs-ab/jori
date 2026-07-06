import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import {
  type EffortPassInput,
  toAllowed as toEffortAllowed,
  toPayload as toEffortPayload,
} from "../effort/input"
import { effortOutputSchema } from "../effort/ops"
import { readEffortOps } from "../effort/parse"
import { type PassScope, type PassStage } from "../schema"
import {
  toAllowed as toWorkstreamAllowed,
  toPayload as toWorkstreamPayload,
  type WorkstreamPassInput,
} from "../workstream/input"
import { workstreamOutputSchema } from "../workstream/ops"
import { readWorkstreamOps } from "../workstream/parse"
import { requestJudge } from "./judge"

export type OpenedPass = {
  passId: Id<"passes">
  stage: PassStage
  scope: PassScope
  window: { start: number; end: number }
}

// The judge glue per stage: assemble, judge, apply. Quiet windows complete
// without a judge call, so frequency only costs when there is activity.
export async function reviewWindow(
  ctx: ActionCtx,
  tenantId: string,
  opened: OpenedPass
) {
  if (opened.stage === "effort") {
    return await reviewEffortWindow(ctx, tenantId, opened)
  }

  return await reviewWorkstreamWindow(ctx, tenantId, opened)
}

async function reviewEffortWindow(
  ctx: ActionCtx,
  tenantId: string,
  opened: OpenedPass
) {
  const input: EffortPassInput = await ctx.runQuery(
    internal.deduction.effort.input.assemble,
    { tenantId, window: opened.window }
  )
  const activity = input.events.length + input.conversations.length
  const { ops, invalid } =
    activity === 0
      ? { ops: [], invalid: 0 }
      : readEffortOps(
          await requestJudge({
            charter: "deduction/effort",
            schemaName: "effort_mutations",
            schema: effortOutputSchema,
            payload: toEffortPayload(input),
          })
        )

  await ctx.runMutation(internal.deduction.effort.apply.apply, {
    passId: opened.passId,
    ops,
    invalid,
    allowed: toEffortAllowed(input),
    context: input.efforts.length,
    activity,
  })
}

async function reviewWorkstreamWindow(
  ctx: ActionCtx,
  tenantId: string,
  opened: OpenedPass
) {
  const input: WorkstreamPassInput = await ctx.runQuery(
    internal.deduction.workstream.input.assemble,
    { tenantId, scope: opened.scope, window: opened.window }
  )
  const { ops, invalid } =
    input.changed === 0
      ? { ops: [], invalid: 0 }
      : readWorkstreamOps(
          await requestJudge({
            charter:
              opened.scope === "window"
                ? "deduction/workstream"
                : "deduction/consolidation",
            schemaName: "workstream_mutations",
            schema: workstreamOutputSchema(opened.scope),
            payload: toWorkstreamPayload(input),
          })
        )

  await ctx.runMutation(internal.deduction.workstream.apply.apply, {
    passId: opened.passId,
    ops,
    invalid,
    allowed: toWorkstreamAllowed(input),
    context: input.roster.length,
    activity: input.efforts.length,
  })
}
