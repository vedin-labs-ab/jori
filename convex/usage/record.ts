import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { readOrganizationTimezone } from "../organization/profile"
import {
  type UsageAttribution,
  type UsageTrigger,
  usageDate,
  usageKey,
} from "./key"

// The write path for the rollup. Two things accrue against a run, at two
// different moments: what it spent, whenever a model turn is debited, and
// that it ended, once. Both land in the same daily bucket, so the folder a
// run was stamped with decides where its money and its count both go.

type UsageTotals = Pick<Doc<"usage">, "micros" | "runs" | "tokens">

type BucketIdentity = { organizationId: string; date: string; key: string }

const triggersByCause = {
  time: "schedule",
  event: "event",
  message: "message",
  manual: "manual",
} as const satisfies Record<Doc<"runs">["cause"]["type"], UsageTrigger>

/** Money and tokens for one metered model turn. A run is debited turn by
 *  turn, and a turn can still be debited after the run has failed, so this
 *  never assumes the bucket is untouched or the run still live. */
export async function recordUsageDebit(
  ctx: MutationCtx,
  args: {
    run: Doc<"runs">
    micros: number
    tokens: { input: number; output: number }
  }
) {
  await accrue(ctx, args.run, {
    runs: { ended: 0, failed: 0 },
    micros: args.micros,
    tokens: args.tokens,
  })
}

/** One run reaching its end. Rides the transition that flips the run's
 *  status, which happens once, so a run is counted once. */
export async function recordUsageEnded(
  ctx: MutationCtx,
  args: { run: Doc<"runs">; failed: boolean }
) {
  await accrue(ctx, args.run, {
    runs: { ended: 1, failed: args.failed ? 1 : 0 },
    micros: 0,
    tokens: { input: 0, output: 0 },
  })
}

/**
 * Deleting a folder never deletes what it cost: rows filed under it follow
 * the deleted folder's parent instead. `folderId` is part of the key, so a
 * moved row has to be re-keyed, and the destination may already hold that
 * day's bucket for the same tuple — the two are then summed into one.
 * Returns the rows touched, for the sweep's budget.
 */
export async function reparentUsage(
  ctx: MutationCtx,
  args: {
    folderId: Id<"folders">
    destination: Id<"folders"> | undefined
    budget: number
  }
) {
  const rows = await ctx.db
    .query("usage")
    .withIndex("by_folder_and_date", (index) =>
      index.eq("folderId", args.folderId)
    )
    .take(args.budget)

  for (const row of rows) {
    await moveBucket(ctx, row, args.destination)
  }

  return rows.length
}

async function moveBucket(
  ctx: MutationCtx,
  row: Doc<"usage">,
  destination: Id<"folders"> | undefined
) {
  const key = usageKey({ ...row, folderId: destination })
  const target = await findBucket(ctx, { ...row, key })

  if (target === null) {
    await ctx.db.patch(row._id, { folderId: destination, key })

    return
  }

  await ctx.db.patch(target._id, {
    ...sumTotals(target, row),
    updatedAt: Math.max(target.updatedAt, row.updatedAt),
  })
  await ctx.db.delete(row._id)
}

/** Adds one contribution to the day's bucket for the run's tuple, opening
 *  that bucket the first time the tuple is metered. */
async function accrue(ctx: MutationCtx, run: Doc<"runs">, totals: UsageTotals) {
  const now = Date.now()
  const attribution = await resolveAttribution(ctx, run)
  const identity = {
    organizationId: run.organizationId,
    date: usageDate(
      now,
      await readOrganizationTimezone(ctx, run.organizationId)
    ),
    key: usageKey(attribution),
  }
  const bucket = await findBucket(ctx, identity)

  if (bucket === null) {
    await ctx.db.insert("usage", {
      ...identity,
      ...attribution,
      ...totals,
      updatedAt: now,
    })

    return
  }

  await ctx.db.patch(bucket._id, {
    ...sumTotals(bucket, totals),
    updatedAt: now,
  })
}

function findBucket(ctx: MutationCtx, identity: BucketIdentity) {
  return ctx.db
    .query("usage")
    .withIndex("by_organization_and_key_and_date", (index) =>
      index
        .eq("organizationId", identity.organizationId)
        .eq("key", identity.key)
        .eq("date", identity.date)
    )
    .unique()
}

/** Read off the run, never joined at read time: a run carries the folder it
 *  was filed under when it was created, and the automation carries its own
 *  label because the automation row may already be gone. */
async function resolveAttribution(
  ctx: MutationCtx,
  run: Doc<"runs">
): Promise<UsageAttribution> {
  return {
    folderId: run.folderId,
    automation: await resolveAutomation(ctx, run),
    personId: run.createdBy,
    surface: run.snapshot.source.surface ?? "jori",
    trigger: triggersByCause[run.cause.type],
  }
}

async function resolveAutomation(ctx: MutationCtx, run: Doc<"runs">) {
  if (run.automationId === undefined) {
    return undefined
  }

  const automation = await ctx.db.get(run.automationId)

  // An automation run's snapshot title is the automation's name, so a
  // one-shot automation deleted the moment it fired still reads as itself.
  return { id: run.automationId, label: automation?.name ?? run.snapshot.title }
}

function sumTotals(left: UsageTotals, right: UsageTotals): UsageTotals {
  return {
    runs: {
      ended: left.runs.ended + right.runs.ended,
      failed: left.runs.failed + right.runs.failed,
    },
    micros: left.micros + right.micros,
    tokens: {
      input: left.tokens.input + right.tokens.input,
      output: left.tokens.output + right.tokens.output,
    },
  }
}
