import { expect, test } from "vitest"
import { buildPulse, pulseDayCount } from "./series"

const now = new Date(2026, 6, 11, 15, 30).getTime()

function daysAgo(days: number, hour = 12) {
  return new Date(2026, 6, 11 - days, hour).getTime()
}

const workstreams = [
  { id: "ws1", name: "Provider Integrations" },
  { id: "ws2", name: "Context: Organization" },
]

function monthDay(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

test("builds calendar columns ending today", () => {
  const pulse = buildPulse([], [], now)

  expect(pulse.days).toHaveLength(pulseDayCount)
  expect(pulse.days.at(-1)?.isToday).toBe(true)
  expect(pulse.days.at(-1)?.label).toBe("Today")
  expect(pulse.days.at(-1)?.emphasized).toBe(true)
  expect(pulse.days[0]?.label).toBe(monthDay(new Date(2026, 5, 28)))
  expect(pulse.days[1]?.label).toBe("")
  expect(pulse.days[2]?.label).toBe("30")
  expect(pulse.days[3]?.label).toBe(monthDay(new Date(2026, 6, 1)))
  expect(pulse.days[3]?.emphasized).toBe(true)
  expect(pulse.days[4]?.label).toBe("")
  expect(pulse.days[5]?.label).toBe("3")
  expect(pulse.days[4]?.emphasized).toBe(false)
  expect(pulse.days.filter((day) => day.isToday)).toHaveLength(1)
})

test("labels every wide-window day, dropping only post-anchor numbers", () => {
  const pulse = buildPulse([], [], now, 30)

  expect(pulse.days).toHaveLength(30)
  expect(pulse.days[0]?.label).toBe(monthDay(new Date(2026, 5, 12)))
  expect(pulse.days[1]?.label).toBe("")
  expect(pulse.days[2]?.label).toBe("14")
  expect(pulse.days[19]?.label).toBe(monthDay(new Date(2026, 6, 1)))
  expect(pulse.days[20]?.label).toBe("")
  expect(pulse.days[21]?.label).toBe("3")
  expect(pulse.days.at(-1)?.label).toBe("Today")

  const labeled = pulse.days.filter((day) => day.label !== "")

  expect(labeled).toHaveLength(28)
})

test("keeps a month boundary instead of an adjacent range start", () => {
  const julyThirteenth = new Date(2026, 6, 13, 15, 30).getTime()
  const pulse = buildPulse([], [], julyThirteenth)

  expect(pulse.days[0]?.label).toBe("")
  expect(pulse.days[1]?.label).toBe(monthDay(new Date(2026, 6, 1)))
  expect(pulse.days[2]?.label).toBe("")
  expect(pulse.days[3]?.label).toBe("3")
})

test("buckets entries into lanes by current membership", () => {
  const entries = [
    { observedAt: daysAgo(0), effort: "Cards", workstreamId: "ws1" },
    { observedAt: daysAgo(0, 23), effort: "Drive", workstreamId: "ws1" },
    { observedAt: daysAgo(4), effort: "Places", workstreamId: "ws2" },
    { observedAt: daysAgo(0), effort: "Playbooks", workstreamId: null },
  ]
  const pulse = buildPulse(entries, workstreams, now)

  expect(pulse.lanes.map((lane) => lane.name)).toEqual([
    "Provider Integrations",
    "Context: Organization",
    "Unplaced",
  ])
  expect(pulse.lanes[0]?.cells.at(-1)?.count).toBe(2)
  expect(pulse.lanes[0]?.cells.at(-1)?.efforts).toEqual(["Cards", "Drive"])
  expect(pulse.lanes[1]?.cells.at(-5)?.count).toBe(1)
  expect(pulse.lanes[2]?.cells.at(-1)?.efforts).toEqual(["Playbooks"])
})

test("drops quiet lanes and out-of-window entries", () => {
  const entries = [
    {
      observedAt: daysAgo(pulseDayCount),
      effort: "Old",
      workstreamId: "ws1",
    },
    { observedAt: daysAgo(1), effort: "Fresh", workstreamId: "ws2" },
  ]
  const pulse = buildPulse(entries, workstreams, now)

  expect(pulse.lanes.map((lane) => lane.name)).toEqual([
    "Context: Organization",
  ])
})

test("dedupes effort names within a day but counts every entry", () => {
  const entries = [
    { observedAt: daysAgo(2, 9), effort: "Cards", workstreamId: "ws1" },
    { observedAt: daysAgo(2, 17), effort: "Cards", workstreamId: "ws1" },
  ]
  const pulse = buildPulse(entries, workstreams, now)
  const cell = pulse.lanes[0]?.cells.at(-3)

  expect(cell?.count).toBe(2)
  expect(cell?.efforts).toEqual(["Cards"])
})
