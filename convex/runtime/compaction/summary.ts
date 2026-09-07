import { v } from "convex/values"
import { defaultSelection } from "../../../contracts/models/selection"
import { isTerminalRunStatus } from "../../../contracts/runtime/runs"
import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import {
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../../_generated/server"
import { providerPreferences, sendOpenRouterChat } from "../../model/openrouter"
import { recordWorkerTrace } from "../../runs/execution/traces/data"
import {
  compactTranscript,
  keepBoundary,
  summaryKeepTurns,
} from "../../runs/execution/transcript/compact"
import { listTranscriptRows } from "../../runs/execution/transcript/data"
import {
  type TranscriptMessage,
  transcriptMessage,
} from "../../runs/execution/transcript/schema"
import { type QueryLikeCtx } from "../../shared/context"
import { compactionSequence } from "./plan"
import { compactionPrompt, compactionSummaryTokens } from "./prompt"

type RunTurn = { runId: Id<"runs">; turn: number }

/** The rows a summary would replace, as the model has been seeing them. */
export type PendingCompaction = {
  before: number
  messages: TranscriptMessage[]
  tokensBefore: number
}

/**
 * The summary step: one model call over the rows older than the last few
 * turns, whose answer stands in for them from here on. Its own module so
 * the loop's step actions never load the client statically. A run
 * summarizes once; a retry that finds the summary written does nothing.
 */
export const step = internalAction({
  args: { runId: v.id("runs"), turn: v.number() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const pending: PendingCompaction | null = await ctx.runQuery(
      internal.runtime.compaction.summary.pending,
      args
    )

    if (pending === null) {
      return null
    }

    await ctx.runMutation(internal.runtime.compaction.summary.commit, {
      ...args,
      before: pending.before,
      content: await summarizeTranscript(pending.messages),
      tokensBefore: pending.tokensBefore,
    })

    return null
  },
})

export const pending = internalQuery({
  args: { runId: v.id("runs"), turn: v.number() },
  returns: v.union(
    v.null(),
    v.object({
      before: v.number(),
      messages: v.array(transcriptMessage),
      tokensBefore: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await readPendingSummary(ctx, args)
  },
})

export const commit = internalMutation({
  args: {
    before: v.number(),
    content: v.string(),
    runId: v.id("runs"),
    tokensBefore: v.number(),
    turn: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await commitSummary(ctx, args)
  },
})

export async function readPendingSummary(
  ctx: QueryLikeCtx,
  args: RunTurn
): Promise<PendingCompaction | null> {
  const run = await ctx.db.get(args.runId)

  if (
    run === null ||
    isTerminalRunStatus(run.status) ||
    run.compaction?.summary !== undefined
  ) {
    return null
  }

  const rows = await listTranscriptRows(ctx, run._id)
  const before = keepBoundary(rows, summaryKeepTurns)

  if (before === null) {
    return null
  }

  return {
    before,
    messages: compactTranscript(
      rows.filter((row) => row.order < before),
      run.compaction
    ),
    tokensBefore: run.promptTokens ?? 0,
  }
}

export async function commitSummary(
  ctx: MutationCtx,
  args: RunTurn & { before: number; content: string; tokensBefore: number }
) {
  const run = await ctx.db.get(args.runId)

  if (
    run === null ||
    isTerminalRunStatus(run.status) ||
    run.compaction?.summary !== undefined
  ) {
    return null
  }

  await ctx.db.patch(run._id, {
    compaction: {
      clearedAtTurn: args.turn,
      ...run.compaction,
      summary: { before: args.before, content: args.content, turn: args.turn },
    },
  })

  const sequence = compactionSequence(args.turn, "summarized")

  await recordWorkerTrace(ctx, {
    data: {
      kind: "summarized",
      fromOrder: 1,
      toOrder: args.before,
      tokensBefore: args.tokensBefore,
    },
    key: `${run._id}:${sequence}:transcript.compacted`,
    runId: run._id,
    sequence,
    type: "transcript.compacted",
  })

  return null
}

async function summarizeTranscript(messages: TranscriptMessage[]) {
  const response = await sendOpenRouterChat({
    maxTokens: compactionSummaryTokens,
    messages: [{ content: compactionPrompt(messages), role: "user" }],
    // Condensing is mechanical work, so it runs on the default selection's
    // model at low effort whatever the run itself is on.
    model: defaultSelection.model,
    provider: providerPreferences(),
    reasoning: { effort: "low" },
  })
  const content = response.choices[0]?.message.content

  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("The compaction summary came back empty.")
  }

  return content.trim()
}
