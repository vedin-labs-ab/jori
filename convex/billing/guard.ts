import {
  type BudgetReason,
  budgetSentence,
  interactiveGraceMicros,
} from "../../contracts/billing"
import { type MutationCtx } from "../_generated/server"
import { availableMicros, ensureAccount } from "./account"

type RunBudget = { ok: true } | { ok: false; reason: BudgetReason }

/**
 * Decides whether new work may start. Interactive work (console instructions,
 * mentions) gets a small grace below zero so Jori never goes silent
 * mid-conversation; scheduled work stops at zero. In-flight runs are never
 * blocked, only new ones.
 */
export async function checkRunBudget(
  ctx: MutationCtx,
  args: { organizationId: string; interactive: boolean }
): Promise<RunBudget> {
  const account = await ensureAccount(ctx, args.organizationId)
  const now = Date.now()

  if (account.state.kind === "paused") {
    return { ok: false, reason: "paused" }
  }

  if (account.state.kind === "trial" && account.state.endsAt < now) {
    return { ok: false, reason: "trial-ended" }
  }

  const floor = args.interactive ? -interactiveGraceMicros : 0

  if (availableMicros(account) <= floor) {
    return { ok: false, reason: "out-of-usage" }
  }

  return { ok: true }
}

export async function requireRunBudget(
  ctx: MutationCtx,
  args: { organizationId: string; interactive: boolean }
) {
  const budget = await checkRunBudget(ctx, args)

  if (!budget.ok) {
    throw new Error(budgetSentence(budget.reason, "new work cannot start"))
  }
}
