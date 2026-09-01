import { expect, test } from "vitest"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { automationDoc, folderDoc } from "../../test/convex/folders"
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
  })
  await seedUsage(database, {
    date: "2026-03-14",
    folderId: grandchildId,
    micros: 3000,
  })

  const usage = await read(ctx, { folderId: rootId })

  expect(usage.totals.micros).toBe(3210)
  // The drill-down is per direct child, each standing for its own subtree.
  expect(usage.folders).toEqual([
    { folderId: childId, name: "Pipeline", micros: 3200 },
  ])
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
    { folderId: busyId, name: "Sales", micros: 900 },
    { folderId: quietId, name: "Ops", micros: 5 },
  ])
  expect(usage.unfiled).toMatchObject({ micros: 40, ended: 2, failed: 1 })
  expect(usage.totals.micros).toBe(945)
})

test("a folder view has no unfiled bucket to show", async () => {
  const { database, ctx } = databaseContext()
  const folderId = await seedFolder(database)

  await seedUsage(database, { date: "2026-03-15", micros: 40 })
  await seedUsage(database, { date: "2026-03-15", folderId, micros: 7 })

  const usage = await read(ctx, { folderId })

  expect(usage.unfiled).toBeNull()
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
  expect(usage.folders).toEqual([])
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
      automation: {
        id: `automations:${rank}` as Id<"automations">,
        label: `Automation ${rank}`,
      },
    })
  }

  const usage = await read(ctx)

  expect(usage.automations.map((entry) => entry.micros)).toEqual([
    1000, 900, 800, 700, 600, 500, 400, 300, 200, 100,
  ])
})

test("work nobody automated ranks as its own contributor", async () => {
  const { database, ctx } = databaseContext()

  await seedUsage(database, { date: "2026-03-15", micros: 60, ended: 3 })

  expect(await read(ctx).then((usage) => usage.automations)).toEqual([
    { label: "Interactive work", micros: 60, ended: 3, failed: 0 },
  ])
})

test("only an automation that still exists is linkable", async () => {
  const { database, ctx } = databaseContext()
  const liveId = (await database.insert(
    "automations",
    automationDoc({ name: "Morning digest" })
  )) as Id<"automations">

  await seedUsage(database, {
    date: "2026-03-15",
    micros: 90,
    automation: { id: liveId, label: "Morning digest" },
  })
  await seedUsage(database, {
    date: "2026-03-15",
    micros: 20,
    automation: {
      id: "automations:gone" as Id<"automations">,
      label: "One-shot reminder",
    },
  })

  const usage = await read(ctx)

  expect(usage.automations).toEqual([
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

  expect(usage.timezone).toBe("Pacific/Kiritimati")
  expect(usage.series.at(0)?.date).toBe("2026-03-10")
  expect(usage.series.at(-1)?.date).toBe("2026-03-16")
})
