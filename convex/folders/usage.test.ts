import { expect, test } from "vitest"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { folderDoc, jobDoc } from "../../test/convex/folders"
import { seedUsage } from "../../test/convex/usage"
import { type Id } from "../_generated/dataModel"
import { readFolderUsage } from "./usage"

// Every read stands at one fixed moment so the window is a known set of
// dates: a seven-day window ending 2026-03-15 runs 03-09 to 03-15, and the
// window it is compared against runs 03-02 to 03-08.

const now = Date.parse("2026-03-15T12:00:00.000Z")
const viewer = "persons:viewer" as Id<"persons">

async function seedFolder(
  database: TestDatabase,
  overrides: Parameters<typeof folderDoc>[0] = {}
) {
  return (await database.insert(
    "folders",
    folderDoc(overrides)
  )) as Id<"folders">
}

function read(
  ctx: ReturnType<typeof databaseContext>["ctx"],
  args: { days?: 7 | 30 | 90; folderId?: Id<"folders"> } = {}
) {
  return readFolderUsage(ctx, {
    organizationId: "org",
    personId: viewer,
    days: args.days ?? 7,
    now,
    ...(args.folderId === undefined ? {} : { folderId: args.folderId }),
  })
}

test("every day of the window gets a point, quiet days included", async () => {
  const { database, ctx } = databaseContext()

  await seedUsage(database, { date: "2026-03-15", micros: 500 })
  await seedUsage(database, { date: "2026-03-11", micros: 100 })

  const { series } = await read(ctx)

  expect(series.map((day) => day.date)).toEqual([
    "2026-03-09",
    "2026-03-10",
    "2026-03-11",
    "2026-03-12",
    "2026-03-13",
    "2026-03-14",
    "2026-03-15",
  ])
  expect(series.map((day) => day.micros)).toEqual([0, 0, 100, 0, 0, 0, 500])
})

test("a folder's total sums its whole subtree, not just its own rows", async () => {
  const { database, ctx } = databaseContext()
  const rootId = await seedFolder(database, { name: "Sales" })
  const childId = await seedFolder(database, {
    name: "Pipeline",
    parentId: rootId,
  })
  const grandchildId = await seedFolder(database, {
    name: "Inbound",
    parentId: childId,
  })

  await seedUsage(database, {
    date: "2026-03-15",
    folderId: rootId,
    micros: 10,
  })
  await seedUsage(database, {
    date: "2026-03-15",
    folderId: childId,
    micros: 200,
    ended: 1,
  })
  await seedUsage(database, {
    date: "2026-03-14",
    folderId: grandchildId,
    micros: 3000,
    ended: 2,
    failed: 1,
  })

  const usage = await read(ctx, { folderId: rootId })

  expect(usage.totals.micros).toBe(3210)
  // The division is per direct child, each standing for its own subtree,
  // runs included, beside the folder's own rows.
  expect(usage.folders).toEqual([
    {
      key: childId,
      folderId: childId,
      label: "Pipeline",
      micros: 3200,
      ended: 3,
      failed: 1,
    },
    { key: "direct", label: "Filed here", micros: 10, ended: 0, failed: 0 },
  ])
  // And each day is divided the same way.
  expect(
    usage.series.find((day) => day.date === "2026-03-14")?.segments
  ).toEqual({ [childId]: { micros: 3000, ended: 2, failed: 1 } })
  expect(
    usage.series.find((day) => day.date === "2026-03-15")?.segments
  ).toEqual({
    [childId]: { micros: 200, ended: 1, failed: 0 },
    direct: { micros: 10, ended: 0, failed: 0 },
  })
})

test("the organization view ranks root folders and names the unfiled rest", async () => {
  const { database, ctx } = databaseContext()
  const quietId = await seedFolder(database, { name: "Ops" })
  const busyId = await seedFolder(database, { name: "Sales" })
  const childId = await seedFolder(database, {
    name: "Pipeline",
    parentId: busyId,
  })

  await seedUsage(database, {
    date: "2026-03-15",
    folderId: quietId,
    micros: 5,
  })
  await seedUsage(database, {
    date: "2026-03-15",
    folderId: childId,
    micros: 900,
  })
  await seedUsage(database, {
    date: "2026-03-13",
    micros: 40,
    ended: 2,
    failed: 1,
  })

  const usage = await read(ctx)

  expect(usage.folders).toEqual([
    {
      key: busyId,
      folderId: busyId,
      label: "Sales",
      micros: 900,
      ended: 0,
      failed: 0,
    },
    { key: "direct", label: "Unfiled", micros: 40, ended: 2, failed: 1 },
    {
      key: quietId,
      folderId: quietId,
      label: "Ops",
      micros: 5,
      ended: 0,
      failed: 0,
    },
  ])
  expect(usage.totals.micros).toBe(945)
})

test("a folder view divides into its own rows, not the unfiled rest", async () => {
  const { database, ctx } = databaseContext()
  const folderId = await seedFolder(database)

  await seedUsage(database, { date: "2026-03-15", micros: 40 })
  await seedUsage(database, { date: "2026-03-15", folderId, micros: 7 })

  const usage = await read(ctx, { folderId })

  expect(usage.folders).toEqual([
    { key: "direct", label: "Filed here", micros: 7, ended: 0, failed: 0 },
  ])
  expect(usage.totals.micros).toBe(7)
})

test("a subfolder nobody may see keeps its spend and loses its name", async () => {
  const { database, ctx } = databaseContext()
  const rootId = await seedFolder(database, { name: "Sales" })
  const hiddenId = await seedFolder(database, {
    name: "Board",
    parentId: rootId,
    visibility: { mode: "private" },
  })

  await seedUsage(database, {
    date: "2026-03-15",
    folderId: hiddenId,
    micros: 800,
  })

  const usage = await read(ctx, { folderId: rootId })

  expect(usage.totals.micros).toBe(800)
  expect(usage.folders).toEqual([
    { key: "other", label: "Other", micros: 800, ended: 0, failed: 0 },
  ])
})

test("the window before this one is what the delta measures against", async () => {
  const { database, ctx } = databaseContext()

  await seedUsage(database, { date: "2026-03-15", micros: 300, ended: 2 })
  await seedUsage(database, { date: "2026-03-05", micros: 100, ended: 5 })
  // Older than both windows, so it counts toward neither.
  await seedUsage(database, { date: "2026-03-01", micros: 999 })

  const usage = await read(ctx)

  expect(usage.totals.micros).toBe(300)
  // Whole, so runs and cost per run can be measured against it too.
  expect(usage.previous.micros).toBe(100)
  expect(usage.previous.ended).toBe(5)
})

test("the ranking names every contributor, not just its leaders", async () => {
  const { database, ctx } = databaseContext()

  for (let rank = 0; rank < 10; rank += 1) {
    await seedUsage(database, {
      date: "2026-03-15",
      micros: (10 - rank) * 100,
      job: {
        id: `jobs:${rank}` as Id<"jobs">,
        label: `Job ${rank}`,
      },
    })
  }

  const usage = await read(ctx)

  expect(usage.jobs.map((entry) => entry.micros)).toEqual([
    1000, 900, 800, 700, 600, 500, 400, 300, 200, 100,
  ])
})

test("work no job did ranks as its own contributor", async () => {
  const { database, ctx } = databaseContext()

  await seedUsage(database, { date: "2026-03-15", micros: 60, ended: 3 })

  expect(await read(ctx).then((usage) => usage.jobs)).toEqual([
    { label: "Interactive work", micros: 60, ended: 3, failed: 0 },
  ])
})

test("only a job that still exists is linkable", async () => {
  const { database, ctx } = databaseContext()
  const liveId = (await database.insert(
    "jobs",
    jobDoc({ name: "Morning digest" })
  )) as Id<"jobs">

  await seedUsage(database, {
    date: "2026-03-15",
    micros: 90,
    job: { id: liveId, label: "Morning digest" },
  })
  await seedUsage(database, {
    date: "2026-03-15",
    micros: 20,
    job: {
      id: "jobs:gone" as Id<"jobs">,
      label: "One-shot reminder",
    },
  })

  const usage = await read(ctx)

  expect(usage.jobs).toEqual([
    { id: liveId, label: "Morning digest", micros: 90, ended: 0, failed: 0 },
    { label: "One-shot reminder", micros: 20, ended: 0, failed: 0 },
  ])
})

test("the window's days are the organization's days, not UTC's", async () => {
  const { database, ctx } = databaseContext()

  // Kiritimati is fourteen hours ahead, so midday UTC is already tomorrow
  // there and the window has to end on that later date.
  await database.insert("organizationProfile", {
    organizationId: "org",
    aliases: [],
    domains: [],
    declared: { domains: [], timezone: "Pacific/Kiritimati" },
    updatedAt: 0,
  })

  const usage = await read(ctx)

  expect(usage.series.at(0)?.date).toBe("2026-03-10")
  expect(usage.series.at(-1)?.date).toBe("2026-03-16")
})
