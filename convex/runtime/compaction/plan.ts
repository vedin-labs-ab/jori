import { v } from "convex/values"
import { joriModel } from "../../../contracts/billing"
import { isTerminalRunStatus } from "../../../contracts/runtime/runs"
import { internalQuery } from "../../_generated/server"
import { type ModelWindow, modelWindow } from "../../model/window"
import { type RunCompaction } from "../../runs/schema"

export type CompactionPlan = "clear" | "none" | "summarize"
export type CompactionKind = "cleared" | "summarized"

/** Shares of the prompt budget at which a run clears old tool results and,
 *  once a cleared prompt still reads this full, summarizes its history. */
export const compactionThresholds = { clear: 0.75, summarize: 0.85 }

/** The completion shares the window with the prompt, so at least this much
 *  of it stays free for the answer even when the provider names no cap. */
export const completionHeadroom = 32_000

/** What the prompt may grow to: the window less the room the answer needs. */
export function contextBudget(window: ModelWindow) {
  const headroom = Math.max(window.maxCompletionTokens ?? 0, completionHeadroom)

  return Math.max(1, window.contextLength - headroom)
}

export function contextRatio(promptTokens: number, window: ModelWindow) {
  return promptTokens / contextBudget(window)
}

/**
 * What to do before the next turn, from the tokens the last turn's prompt
 * measured. Those tokens only reflect a clearing that ran before that
 * turn, so a summary waits until a cleared prompt still reads too full;
 * a run summarizes at most once and keeps clearing after.
 */
export function compactionPlan(args: {
  compaction: RunCompaction | undefined
  promptTokens: number | undefined
  turn: number
  window: ModelWindow
}): CompactionPlan {
  const ratio = contextRatio(args.promptTokens ?? 0, args.window)

  if (ratio < compactionThresholds.clear) {
    return "none"
  }

  const measuredCleared =
    args.compaction !== undefined && args.compaction.clearedAtTurn < args.turn
  const summarized = args.compaction?.summary !== undefined

  return ratio >= compactionThresholds.summarize &&
    measuredCleared &&
    !summarized
    ? "summarize"
    : "clear"
}

/** Both steps sit just before the turn's model call in the trace order. */
export function compactionSequence(turn: number, kind: CompactionKind) {
  return turn * 100 - (kind === "cleared" ? 3 : 2)
}

export const read = internalQuery({
  args: { runId: v.id("runs"), turn: v.number() },
  returns: v.union(
    v.literal("clear"),
    v.literal("none"),
    v.literal("summarize")
  ),
  handler: async (ctx, args): Promise<CompactionPlan> => {
    const run = await ctx.db.get(args.runId)

    if (run === null || isTerminalRunStatus(run.status)) {
      return "none"
    }

    return compactionPlan({
      compaction: run.compaction,
      promptTokens: run.promptTokens,
      turn: args.turn,
      window: await modelWindow(ctx, joriModel),
    })
  },
})
