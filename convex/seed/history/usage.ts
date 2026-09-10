import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { runModel } from "../../model/selection"
import { usageDate, usageKey } from "../../usage/key"
import { clearOrganization, type SeedContext, seedTimezone } from "../context"
import { type SeededRun } from "./runs"

// The usage rollup is a cache over runs, so it is built here from the runs
// the seed just wrote rather than invented beside them: every breakdown the
// console offers is a grouping of these rows, and they cannot disagree with
// the run list they came from.
//
// The product's own write path buckets on the moment of the debit, which is
// correct while work is live and wrong for history — sixty days of runs would
// all land on today. Only the bucketing is redone; the key is the product's.

type Bucket = Pick<
  Doc<"usage">,
  | "job"
  | "date"
  | "folderId"
  | "key"
  | "micros"
  | "model"
  | "personId"
  | "runs"
  | "surface"
  | "tokens"
  | "trigger"
>

const triggersByCause = {
  time: "schedule",
  event: "event",
  message: "message",
  manual: "manual",
} as const satisfies Record<Doc<"runs">["cause"]["type"], Bucket["trigger"]>

export async function seedUsage(
  ctx: MutationCtx,
  seed: SeedContext,
  seeded: SeededRun[]
) {
  const buckets = new Map<string, Bucket>()

  await clearOrganization(ctx, ["usage"], seed.organizationId)

  for (const { run, item } of seeded) {
    accrue(buckets, await attribute(ctx, run), item)
  }

  for (const bucket of buckets.values()) {
    await ctx.db.insert("usage", {
      organizationId: seed.organizationId,
      ...bucket,
      updatedAt: seed.now,
    })
  }

  return buckets.size
}

/** The tuple a run's day is filed under, read off the run exactly as the
 *  product reads it. */
async function attribute(ctx: MutationCtx, run: Doc<"runs">) {
  const job = run.job === undefined ? undefined : await ctx.db.get(run.job.id)

  return {
    date: usageDate(run.createdAt, seedTimezone),
    folderId: run.folderId,
    conversationId: run.conversationId,
    job:
      run.job === undefined
        ? undefined
        : {
            id: run.job.id,
            label: job?.name ?? run.snapshot.title,
          },
    personId: run.createdBy,
    surface: run.snapshot.source.surface ?? ("jori" as const),
    trigger: triggersByCause[run.cause.type],
    model: runModel(run),
    failed: run.status === "failed",
  }
}

function accrue(
  buckets: Map<string, Bucket>,
  attribution: Awaited<ReturnType<typeof attribute>>,
  cost: { micros: number; tokens: Bucket["tokens"] }
) {
  const { date, failed, ...tuple } = attribution
  const key = usageKey(tuple)
  const existing = buckets.get(`${key}:${date}`)

  if (existing === undefined) {
    buckets.set(`${key}:${date}`, {
      ...tuple,
      date,
      key,
      runs: { ended: 1, failed: failed ? 1 : 0 },
      micros: cost.micros,
      tokens: cost.tokens,
    })

    return
  }

  existing.runs.ended += 1
  existing.runs.failed += failed ? 1 : 0
  existing.micros += cost.micros
  existing.tokens.input += cost.tokens.input
  existing.tokens.output += cost.tokens.output
}
