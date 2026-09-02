import { expect, test } from "vitest"
import { databaseContext } from "../../test/convex/database"
import { automationDoc, folderDoc } from "../../test/convex/folders"
import { seedUsage } from "../../test/convex/usage"
import { type Id } from "../_generated/dataModel"
import { readFolderUsage } from "./usage"

// What the metering layer decides: which of the window's contributors the
// viewer may name, and how far the folder division goes before the rest is
// folded together. The moment is the same fixed one the overview's tests
// stand at: a seven-day window ending 2026-03-15.

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
  return read(ctx).then((usage) => usage.automations)
}

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

test("the division names as many folders as the palette has colours", async () => {
  const { database, ctx } = databaseContext()

  for (let rank = 0; rank < 10; rank += 1) {
    const folderId = (await database.insert(
      "folders",
      folderDoc({ name: `Folder ${rank}` })
    )) as Id<"folders">

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
