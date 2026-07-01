import { type Id } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"

type RunIdContext = Pick<QueryCtx, "db">

export function normalizeRunId(ctx: RunIdContext, value: string | undefined) {
  const trimmed = value?.trim()

  if (trimmed === undefined || trimmed === "") {
    return undefined
  }

  return ctx.db.normalizeId("runs", trimmed)
}

export function normalizeRunIds(
  ctx: RunIdContext,
  values: string[] | undefined
) {
  if (values === undefined || values.length === 0) {
    return undefined
  }

  const runIds: Id<"runs">[] = []
  let hasConcreteInput = false

  for (const value of values) {
    const runId = normalizeRunId(ctx, value)

    if (runId === undefined) {
      continue
    }

    hasConcreteInput = true

    if (runId !== null) {
      runIds.push(runId)
    }
  }

  return hasConcreteInput ? runIds : undefined
}
