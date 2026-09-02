import { expect, test } from "vitest"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { type Doc, type Id } from "../_generated/dataModel"
import { recordUsageDebit, recordUsageEnded, reparentUsage } from "./record"

// The rollup is a cache keyed by attribution: every write finds the day's
// bucket for a run's tuple and adds to it, so money, tokens, and run counts
// can never end up in different rows for the same work.

const folderId = "folder-1" as Id<"folders">
const otherFolderId = "folder-2" as Id<"folders">
const jobId = "job-1" as Id<"jobs">

function run(overrides: Partial<Doc<"runs">> = {}): Doc<"runs"> {
  return {
    _id: "run-1" as Id<"runs">,
    _creationTime: 0,
    organizationId: "org",
    audience: "organization",
    cause: { type: "time", scheduledAt: 0 },
    principal: { kind: "organization" },
    snapshot: { context: [], source: { type: "job" }, title: "Digest" },
    status: "running",
    createdAt: 0,
    ...overrides,
  } as Doc<"runs">
}

async function readBuckets(database: TestDatabase) {
  return (await database
    .query("usage")
    .withIndex("by_organization_and_date", (index) =>
      index.eq("organizationId", "org")
    )
    .collect()) as unknown as Doc<"usage">[]
}

test("turns of the same run accumulate in one bucket", async () => {
  const { database, ctx } = databaseContext()
  const metered = run({ folderId })

  await recordUsageDebit(ctx, {
    run: metered,
    micros: 500,
    tokens: { input: 100, output: 10 },
  })
  await recordUsageDebit(ctx, {
    run: metered,
    micros: 250,
    tokens: { input: 40, output: 5 },
  })

  expect(await readBuckets(database)).toMatchObject([
    {
      folderId,
      micros: 750,
      tokens: { input: 140, output: 15 },
      runs: { ended: 0, failed: 0 },
    },
  ])
})

test("work in different folders never shares a bucket", async () => {
  const { database, ctx } = databaseContext()

  await recordUsageEnded(ctx, { run: run({ folderId }), failed: false })
  await recordUsageEnded(ctx, {
    run: run({ folderId: otherFolderId }),
    failed: false,
  })
  await recordUsageEnded(ctx, { run: run(), failed: false })

  const buckets = await readBuckets(database)

  expect(buckets).toHaveLength(3)
  expect(buckets.map((bucket) => bucket.folderId)).toEqual([
    folderId,
    otherFolderId,
    undefined,
  ])
})

test("a failed run counts as ended and as failed", async () => {
  const { database, ctx } = databaseContext()

  await recordUsageEnded(ctx, { run: run(), failed: true })

  expect((await readBuckets(database))[0]?.runs).toEqual({
    ended: 1,
    failed: 1,
  })
})

test("a stopped run counts as ended and not as failed", async () => {
  const { database, ctx } = databaseContext()

  await recordUsageEnded(ctx, { run: run(), failed: false })

  expect((await readBuckets(database))[0]?.runs).toEqual({
    ended: 1,
    failed: 0,
  })
})

test("a debit landing after a failure joins the same bucket", async () => {
  const { database, ctx } = databaseContext()
  const metered = run({ folderId })

  await recordUsageEnded(ctx, { run: metered, failed: true })
  await recordUsageDebit(ctx, {
    run: metered,
    micros: 900,
    tokens: { input: 20, output: 3 },
  })

  expect(await readBuckets(database)).toMatchObject([
    { micros: 900, runs: { ended: 1, failed: 1 } },
  ])
})

test("the cause of the work becomes the trigger dimension", async () => {
  const { database, ctx } = databaseContext()

  await recordUsageEnded(ctx, { run: run(), failed: false })
  await recordUsageEnded(ctx, {
    run: run({ cause: { type: "manual" } }),
    failed: false,
  })
  await recordUsageEnded(ctx, {
    run: run({ cause: { type: "event", eventId: "event" as Id<"events"> } }),
    failed: false,
  })

  expect((await readBuckets(database)).map((row) => row.trigger)).toEqual([
    "schedule",
    "manual",
    "event",
  ])
})

test("a job's label is carried even once the job is gone", async () => {
  const { database, ctx } = databaseContext()

  await recordUsageEnded(ctx, {
    run: run({
      job: { id: jobId },
      snapshot: runSnapshot("One-shot reminder"),
    }),
    failed: false,
  })

  expect((await readBuckets(database))[0]?.job).toEqual({
    id: jobId,
    label: "One-shot reminder",
  })
})

test("a live job names the row itself", async () => {
  const { database, ctx } = databaseContext()

  await database.insert("jobs", { name: "Renamed digest" })

  await recordUsageEnded(ctx, {
    run: run({ job: { id: "jobs:0" as Id<"jobs"> } }),
    failed: false,
  })

  expect((await readBuckets(database))[0]?.job?.label).toBe("Renamed digest")
})

test("a deleted folder's spend moves to the destination", async () => {
  const { database, ctx } = databaseContext()

  await recordUsageDebit(ctx, {
    run: run({ folderId }),
    micros: 100,
    tokens: { input: 10, output: 1 },
  })

  await reparentUsage(ctx, { folderId, destination: otherFolderId, budget: 10 })

  expect(await readBuckets(database)).toMatchObject([
    { folderId: otherFolderId, micros: 100 },
  ])
})

test("spend landing on a bucket the destination already has is merged", async () => {
  const { database, ctx } = databaseContext()

  await recordUsageDebit(ctx, {
    run: run({ folderId }),
    micros: 100,
    tokens: { input: 10, output: 1 },
  })
  await recordUsageEnded(ctx, { run: run({ folderId }), failed: true })
  await recordUsageDebit(ctx, {
    run: run({ folderId: otherFolderId }),
    micros: 40,
    tokens: { input: 4, output: 2 },
  })

  await reparentUsage(ctx, { folderId, destination: otherFolderId, budget: 10 })

  expect(await readBuckets(database)).toMatchObject([
    {
      folderId: otherFolderId,
      micros: 140,
      tokens: { input: 14, output: 3 },
      runs: { ended: 1, failed: 1 },
    },
  ])
})

test("a deleted root folder's spend becomes unfiled", async () => {
  const { database, ctx } = databaseContext()

  await recordUsageEnded(ctx, { run: run({ folderId }), failed: false })

  await reparentUsage(ctx, { folderId, destination: undefined, budget: 10 })

  expect((await readBuckets(database))[0]?.folderId).toBeUndefined()
})

function runSnapshot(title: string): Doc<"runs">["snapshot"] {
  return { context: [], source: { type: "job" }, title }
}
