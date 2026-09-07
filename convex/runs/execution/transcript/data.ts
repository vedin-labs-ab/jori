import { type Id } from "../../../_generated/dataModel"
import { type MutationCtx } from "../../../_generated/server"
import { type QueryLikeCtx } from "../../../shared/context"
import { compactTranscript, type TranscriptRow } from "./compact"
import { type TranscriptMessage } from "./schema"

export async function appendTranscript(
  ctx: MutationCtx,
  runId: Id<"runs">,
  messages: TranscriptMessage[]
) {
  if (messages.length === 0) {
    return null
  }

  const run = await ctx.db.get(runId)

  if (run === null) {
    throw new Error("Run not found.")
  }

  let order = (await lastRow(ctx, runId))?.order ?? 0

  for (const message of messages) {
    order += 1
    await ctx.db.insert("transcript", {
      organizationId: run.organizationId,
      runId,
      order,
      message,
    })
  }

  return null
}

/** A run's history, oldest first, as the model sees it: whole until the run
 *  condenses it, stubbed and summarized after. A run holds a couple hundred
 *  rows at most, so the model step reads them in one go. */
export async function listTranscript(ctx: QueryLikeCtx, runId: Id<"runs">) {
  const run = await ctx.db.get(runId)

  return compactTranscript(
    await listTranscriptRows(ctx, runId),
    run?.compaction
  )
}

/** The rows as stored, with their orders: what compaction measures and
 *  moves its boundaries against. */
export async function listTranscriptRows(
  ctx: QueryLikeCtx,
  runId: Id<"runs">
): Promise<TranscriptRow[]> {
  const rows = await ctx.db
    .query("transcript")
    .withIndex("by_run_and_order", (query) => query.eq("runId", runId))
    .collect()

  return rows.map((row) => ({ message: row.message, order: row.order }))
}

/**
 * The last assistant row and the tool rows recorded after it. The act step
 * reads it to find the calls it has yet to run, and the model step to tell a
 * retry from a fresh turn. Nothing is returned when the run's last rows are
 * not an assistant turn.
 */
export async function tailTranscript(ctx: QueryLikeCtx, runId: Id<"runs">) {
  const rows = ctx.db
    .query("transcript")
    .withIndex("by_run_and_order", (query) => query.eq("runId", runId))
    .order("desc")
  const results: TranscriptMessage[] = []

  for await (const row of rows) {
    if (row.message.role === "assistant") {
      return { assistant: row.message, results: results.reverse() }
    }

    if (row.message.role !== "tool") {
      break
    }

    results.push(row.message)
  }

  return { assistant: null, results: [] }
}

async function lastRow(ctx: QueryLikeCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("transcript")
    .withIndex("by_run_and_order", (query) => query.eq("runId", runId))
    .order("desc")
    .first()
}
