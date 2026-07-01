import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { runTask, runTitle, triggerLabel } from "../console/labels"

export async function projectRunSummary(ctx: QueryCtx, run: Doc<"runs">) {
  const context = {
    automation: await loadAutomation(ctx, run),
    message: await loadMessage(ctx, run),
    run,
  }
  const error = scrubError(run.error)

  return {
    runId: run._id,
    title: runTitle(context),
    task: runTask(context),
    trigger: triggerLabel(context),
    audienceScope: run.audienceScope ?? "person",
    status: run.status,
    source: run.snapshot.source,
    context: run.snapshot.context,
    ...(error === undefined ? {} : { error }),
    startedAt: run.createdAt,
    endedAt: run.endedAt ?? null,
  }
}

export type RunSummary = Awaited<ReturnType<typeof projectRunSummary>>

export function matchesSummaryQuery(
  summary: RunSummary,
  query: string | undefined
) {
  if (query === undefined) {
    return true
  }

  const haystack = [
    summary.title,
    summary.task,
    summary.trigger,
    ...summary.context.map((item) => item.label),
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(query)
}

async function loadMessage(ctx: QueryCtx, run: Doc<"runs">) {
  return run.cause.type === "message"
    ? await ctx.db.get(run.cause.messageId)
    : null
}

async function loadAutomation(ctx: QueryCtx, run: Doc<"runs">) {
  return run.automationId === undefined
    ? null
    : await ctx.db.get(run.automationId)
}

function scrubError(error: string | undefined) {
  const message = error?.split("\n")[0]?.trim()

  if (message === undefined || message === "") {
    return undefined
  }

  return message.length > 300 ? `${message.slice(0, 297)}...` : message
}
