import { v } from "convex/values"
import { isTerminalRunStatus } from "../../../contracts/runtime/runs"
import { type Doc, type Id } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { checkRunBudget } from "../../billing/guard"
import { recordWorkerTrace } from "../../runs/execution/traces/data"

export type BudgetOutcome = "blocked" | "ok"

/** Why a run stopped between turns, in the words the chat shows under the
 *  turn and the composer's blocked reason repeats. */
export const budgetErrors = {
  "out-of-usage":
    "Jori is out of usage, so the run stopped before its next turn. Add to the wallet in Billing settings, or wait for the monthly reset.",
  paused:
    "The subscription is paused, so the run stopped before its next turn. Visit Billing settings to reactivate it.",
  "trial-ended":
    "The trial has ended, so the run stopped before its next turn. Choose a plan in Billing settings to keep Jori working.",
} as const

/** Interactive work gets the grace floor below zero; scheduled work stops
 *  at it, the way the guard treats new work of each kind. */
export function isInteractiveRun(run: Pick<Doc<"runs">, "cause">) {
  return run.cause.type === "message" || run.cause.type === "manual"
}

/** Sits just before the turn's compaction steps in the trace order. */
export function budgetSequence(turn: number) {
  return turn * 100 - 4
}

/**
 * The per-turn budget check: run creation is gated once, and a run that
 * keeps taking turns is checked again before each one after the first,
 * so an organization that ran dry mid-run stops at the next turn rather
 * than at the end. A blocked run fails through the same trace the
 * overflow fail-safe uses, so the chat shows the notice and the composer
 * the reason. Running it again on the same turn changes nothing.
 */
export const step = internalMutation({
  args: { runId: v.id("runs"), turn: v.number() },
  returns: v.union(v.literal("blocked"), v.literal("ok")),
  handler: async (ctx, args): Promise<BudgetOutcome> => {
    return await checkTurnBudget(ctx, args)
  },
})

export async function checkTurnBudget(
  ctx: MutationCtx,
  args: { runId: Id<"runs">; turn: number }
): Promise<BudgetOutcome> {
  const run = await ctx.db.get(args.runId)

  if (run === null || isTerminalRunStatus(run.status)) {
    return "ok"
  }

  const budget = await checkRunBudget(ctx, {
    organizationId: run.organizationId,
    interactive: isInteractiveRun(run),
  })

  if (budget.ok) {
    return "ok"
  }

  const sequence = budgetSequence(args.turn)

  await recordWorkerTrace(ctx, {
    data: { error: budgetErrors[budget.reason] },
    key: `${run._id}:${sequence}:run.failed`,
    runId: run._id,
    sequence,
    type: "run.failed",
  })

  return "blocked"
}
