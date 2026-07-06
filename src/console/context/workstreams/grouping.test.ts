import { describe, expect, test } from "vitest"
import { groupByDay } from "./grouping"

const dayMs = 24 * 60 * 60 * 1000
// A fixed Monday noon keeps day boundaries deterministic.
const now = new Date(2026, 6, 6, 12, 0, 0).getTime()

function item(agoDays: number) {
  return { observedAt: now - agoDays * dayMs }
}

describe("timeline day grouping", () => {
  test("labels today and yesterday by name, older days by date", () => {
    const days = groupByDay([item(0), item(1), item(3)], now)

    expect(days.map((day) => day.label)).toEqual([
      "Today",
      "Yesterday",
      "Jul 3",
    ])
  })

  test("consecutive same-day entries share a group in order", () => {
    const first = { observedAt: now - 1000 }
    const second = { observedAt: now - 2000 }
    const days = groupByDay([first, second, item(2)], now)

    expect(days).toHaveLength(2)
    expect(days[0]?.items).toEqual([first, second])
  })

  test("days outside the current year carry the year", () => {
    const days = groupByDay([item(220)], now)

    expect(days[0]?.label).toMatch(/2025$/)
  })
})
