import { expect, test } from "vitest"
import { databaseContext } from "../../test/convex/database"
import { automationDoc, folderDoc } from "../../test/convex/folders"
import { seedUsage } from "../../test/convex/usage"
import { type Id } from "../_generated/dataModel"
import { readFolderUsage, readUsageSlice } from "./usage"

// What the metering layer decides: which rows one slice of a window reads,
// and which of the window's contributors the viewer may name. The moment is
// the same fixed one the overview's tests stand at: a seven-day window
// ending 2026-03-15 runs 03-09 to 03-15, and 03-05 belongs to the window
// before it.

const now = Date.parse("2026-03-15T12:00:00.000Z")
const viewer = "persons:viewer" as Id<"persons">
const digest = "automations:digest" as Id<"automations">

function readSlice(
  ctx: ReturnType<typeof databaseContext>["ctx"],
  args: { automationId?: Id<"automations">; folderId?: Id<"folders"> }
) {
  return readUsageSlice(ctx, { organizationId: "org", days: 7, now, ...args })
}

function readRanking(ctx: ReturnType<typeof databaseContext>["ctx"]) {
  return readFolderUsage(ctx, {
    organizationId: "org",
    personId: viewer,
    days: 7,
    now,
  }).then((usage) => usage.automations)
}

function microsOn(
  series: { date: string; micros: number }[],
  date: string
): number {
  return series.find((day) => day.date === date)?.micros ?? 0
}

test("an automation's slice counts that automation and nothing else", async () => {
  const { database, ctx } = databaseContext()

  await seedUsage(database, {
    date: "2026-03-15",
    micros: 700,
    automation: { id: digest, label: "Morning digest" },
  })
  await seedUsage(database, {
    date: "2026-03-15",
    micros: 4000,
    automation: {
      id: "automations:other" as Id<"automations">,
      label: "Sweep",
    },
  })

  const { series } = await readSlice(ctx, { automationId: digest })

  expect(series).toHaveLength(7)
  expect(microsOn(series, "2026-03-15")).toBe(700)
})

test("another organization's rows never answer for this one's automation", async () => {
  const { database, ctx } = databaseContext()

  await seedUsage(database, {
    date: "2026-03-15",
    micros: 50,
    automation: { id: digest, label: "Morning digest" },
  })
  // The automation index is keyed by the automation alone, so this row sits
  // in the very same range the read walks.
  await seedUsage(database, {
    date: "2026-03-15",
    organizationId: "intruder",
    micros: 9000,
    automation: { id: digest, label: "Morning digest" },
  })

  const { series } = await readSlice(ctx, { automationId: digest })

  expect(microsOn(series, "2026-03-15")).toBe(50)
})

test("a folder's slice sums its whole subtree", async () => {
  const { database, ctx } = databaseContext()
  const rootId = (await database.insert(
    "folders",
    folderDoc({ name: "Sales" })
  )) as Id<"folders">
  const childId = (await database.insert(
    "folders",
    folderDoc({ name: "Pipeline", parentId: rootId })
  )) as Id<"folders">

  await seedUsage(database, {
    date: "2026-03-14",
    folderId: rootId,
    micros: 20,
  })
  await seedUsage(database, {
    date: "2026-03-14",
    folderId: childId,
    micros: 300,
  })
  await seedUsage(database, { date: "2026-03-14", micros: 8000 })

  const { series } = await readSlice(ctx, { folderId: rootId })

  expect(microsOn(series, "2026-03-14")).toBe(320)
})

test("a slice stops at the window, with no previous one folded in", async () => {
  const { database, ctx } = databaseContext()

  await seedUsage(database, {
    date: "2026-03-05",
    micros: 400,
    automation: { id: digest, label: "Morning digest" },
  })

  const { series } = await readSlice(ctx, { automationId: digest })

  expect(series.map((day) => day.date).at(0)).toBe("2026-03-09")
  expect(series.every((day) => day.micros === 0)).toBe(true)
})

test("naming both a folder and an automation charts the overlap", async () => {
  const { database, ctx } = databaseContext()
  const folderId = (await database.insert(
    "folders",
    folderDoc()
  )) as Id<"folders">

  // The automation spends on both sides of the folder boundary, and the
  // folder holds work of its own; only their overlap is this chart's.
  await seedUsage(database, {
    date: "2026-03-15",
    folderId,
    micros: 11,
    automation: { id: digest, label: "Morning digest" },
  })
  await seedUsage(database, {
    date: "2026-03-15",
    micros: 6000,
    automation: { id: digest, label: "Morning digest" },
  })
  await seedUsage(database, { date: "2026-03-15", folderId, micros: 400 })

  const { series } = await readSlice(ctx, { automationId: digest, folderId })

  expect(microsOn(series, "2026-03-15")).toBe(11)
})

test("a slice of neither refuses rather than charting a line of zeroes", async () => {
  const { ctx } = databaseContext()

  await expect(readSlice(ctx, {})).rejects.toThrow(
    "Name an automation or a folder to chart."
  )
})

test("an automation nobody may see keeps its money and loses its name", async () => {
  const { database, ctx } = databaseContext()
  const openId = (await database.insert(
    "automations",
    automationDoc({ name: "Morning digest" })
  )) as Id<"automations">
  const closedId = (await database.insert(
    "automations",
    automationDoc({ name: "Board briefing", visibility: { mode: "private" } })
  )) as Id<"automations">

  await seedUsage(database, {
    date: "2026-03-15",
    micros: 100,
    ended: 1,
    automation: { id: openId, label: "Morning digest" },
  })
  await seedUsage(database, {
    date: "2026-03-15",
    micros: 900,
    ended: 4,
    failed: 1,
    automation: { id: closedId, label: "Board briefing" },
  })

  expect(await readRanking(ctx)).toEqual([
    // The row carries the private automation's own name, so the caption is
    // no safer to show than the automation itself.
    {
      label: "Automations you cannot see",
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
      automation: {
        id: `automations:${rank}` as Id<"automations">,
        label: `Automation ${rank}`,
      },
    })
  }

  const ranking = await readRanking(ctx)

  expect(ranking).toHaveLength(100)
  expect(ranking.at(-1)?.micros).toBe(2)
})
