import { expect, test } from "vitest"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { folderDoc, jobDoc } from "../../test/convex/folders"
import { seedUsage } from "../../test/convex/usage"
import { type Id } from "../_generated/dataModel"
import { readFolderSpend, readFolderUsage } from "./usage"

// What the metering layer decides: which rows a scope's window reads, which
// of its contributors the viewer may name, and how far the folder division
// goes before the rest is folded together. The moment is the same fixed one
// the overview's tests stand at: a seven-day window ending 2026-03-15, or
// the hint's fixed month reaching back to 2026-02-14.

const now = Date.parse("2026-03-15T12:00:00.000Z")
const viewer = "persons:viewer" as Id<"persons">

function read(ctx: ReturnType<typeof databaseContext>["ctx"]) {
  return readFolderUsage(ctx, {
    organizationId: "org",
    personId: viewer,
    days: 7,
    now,
  })
}

function readRanking(ctx: ReturnType<typeof databaseContext>["ctx"]) {
  return read(ctx).then((usage) => usage.jobs)
}

async function seedFolder(
  database: TestDatabase,
  overrides: Parameters<typeof folderDoc>[0] = {}
) {
  return (await database.insert(
    "folders",
    folderDoc(overrides)
  )) as Id<"folders">
}

test("a job nobody may see keeps its money and loses its name", async () => {
  const { database, ctx } = databaseContext()
  const openId = (await database.insert(
    "jobs",
    jobDoc({ name: "Morning digest" })
  )) as Id<"jobs">
  const closedId = (await database.insert(
    "jobs",
    jobDoc({ name: "Board briefing", visibility: { mode: "private" } })
  )) as Id<"jobs">

  await seedUsage(database, {
    date: "2026-03-15",
    micros: 100,
    ended: 1,
    job: { id: openId, label: "Morning digest" },
  })
  await seedUsage(database, {
    date: "2026-03-15",
    micros: 900,
    ended: 4,
    failed: 1,
    job: { id: closedId, label: "Board briefing" },
  })

  expect(await readRanking(ctx)).toEqual([
    // The row carries the private job's own name, so the caption is
    // no safer to show than the job itself.
    {
      label: "Jobs you cannot see",
      micros: 900,
      ended: 4,
      failed: 1,
    },
    { id: openId, label: "Morning digest", micros: 100, ended: 1, failed: 0 },
  ])
})

test("the ranking stops well short of the row cap", async () => {
  const { database, ctx } = databaseContext()

  for (let rank = 0; rank < 101; rank += 1) {
    await seedUsage(database, {
      date: "2026-03-15",
      micros: 101 - rank,
      job: {
        id: `jobs:${rank}` as Id<"jobs">,
        label: `Job ${rank}`,
      },
    })
  }

  const ranking = await readRanking(ctx)

  expect(ranking).toHaveLength(100)
  expect(ranking.at(-1)?.micros).toBe(2)
})

test("the division names as many folders as the palette has colors", async () => {
  const { database, ctx } = databaseContext()

  for (let rank = 0; rank < 10; rank += 1) {
    const folderId = await seedFolder(database, { name: `Folder ${rank}` })

    await seedUsage(database, {
      date: "2026-03-15",
      folderId,
      micros: 100 - rank,
      ended: 1,
    })
  }

  const usage = await read(ctx)
  const [day] = usage.series.filter((entry) => entry.date === "2026-03-15")

  // Eight named, biggest first, and the two smallest folded into the rest —
  // in the ranking and on the day alike.
  expect(usage.folders).toHaveLength(9)
  expect(usage.folders.slice(0, 8).map((segment) => segment.label)).toEqual(
    Array.from({ length: 8 }, (_unused, rank) => `Folder ${rank}`)
  )
  expect(usage.folders.at(-1)).toEqual({
    key: "other",
    label: "Other",
    micros: 91 + 92,
    ended: 2,
    failed: 0,
  })
  expect(day?.segments.other).toEqual({ micros: 183, ended: 2, failed: 0 })
  expect(Object.keys(day?.segments ?? {})).toHaveLength(9)
})

test("the hint counts one fixed month of the folder's whole subtree", async () => {
  const { database, ctx } = databaseContext()
  const rootId = await seedFolder(database, { name: "Sales" })
  const childId = await seedFolder(database, {
    name: "Pipeline",
    parentId: rootId,
  })

  await seedUsage(database, { date: "2026-03-15", folderId: rootId, micros: 5 })
  await seedUsage(database, {
    date: "2026-03-01",
    folderId: childId,
    micros: 700,
  })
  // Filed elsewhere, and older than the month: neither counts here.
  await seedUsage(database, { date: "2026-03-15", micros: 40 })
  await seedUsage(database, {
    date: "2026-02-01",
    folderId: childId,
    micros: 999,
  })

  expect(
    await readFolderSpend(ctx, {
      organizationId: "org",
      folderId: rootId,
      now,
    })
  ).toEqual({ micros: 705 })
})

test("the hint over the whole organization counts the unfiled rest too", async () => {
  const { database, ctx } = databaseContext()
  const folderId = await seedFolder(database)

  await seedUsage(database, { date: "2026-03-15", folderId, micros: 60 })
  await seedUsage(database, { date: "2026-02-20", micros: 7 })

  expect(await readFolderSpend(ctx, { organizationId: "org", now })).toEqual({
    micros: 67,
  })
})
