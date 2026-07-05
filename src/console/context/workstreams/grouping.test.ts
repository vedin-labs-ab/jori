import { describe, expect, test } from "vitest"
import { groupTimeline } from "./grouping"

const dayMs = 24 * 60 * 60 * 1000
// A fixed Monday noon keeps day and week boundaries deterministic.
const now = new Date(2026, 6, 6, 12, 0, 0).getTime()

function item(agoDays: number, effort = "Shared Timeline") {
  return { observedAt: now - agoDays * dayMs, effort }
}

describe("timeline grouping", () => {
  test("tiers by age: open days, collapsed weeks, collapsed months", () => {
    const sections = groupTimeline([item(0), item(1), item(10), item(45)], now)

    expect(sections.map((section) => section.tier)).toEqual([
      "day",
      "day",
      "week",
      "month",
    ])
    expect(sections[0]?.label).toBe("Today")
    expect(sections[1]?.label).toBe("Yesterday")
    expect(sections[2]?.label).toMatch(/^Week of /)
  })

  test("consecutive entries share a section and count in the meta", () => {
    const sections = groupTimeline(
      [
        item(10, "Shared Timeline"),
        item(11, "Workstreams Tab"),
        item(12, "Workstreams Tab"),
      ],
      now
    )

    expect(sections).toHaveLength(1)
    expect(sections[0]?.items).toHaveLength(3)
    expect(sections[0]?.meta).toBe(
      "3 updates · Shared Timeline, Workstreams Tab"
    )
  })

  test("meta caps the effort list and day sections carry none", () => {
    const sections = groupTimeline(
      [item(0), item(40, "A"), item(41, "B"), item(42, "C")],
      now
    )

    expect(sections[0]?.meta).toBe("")
    expect(sections[1]?.meta).toBe("3 updates · A, B…")
  })

  test("months outside the current year carry the year", () => {
    const sections = groupTimeline([item(220)], now)

    expect(sections[0]?.tier).toBe("month")
    expect(sections[0]?.label).toMatch(/2025$/)
  })
})
