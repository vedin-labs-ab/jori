// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { UsageStats } from "./stats"
import { type UsageDays, type UsageOverview } from "./types"

afterEach(cleanup)

function overview(totals: {
  micros: number
  ended: number
  failed: number
  previousMicros: number
}) {
  return {
    totals: {
      micros: totals.micros,
      ended: totals.ended,
      failed: totals.failed,
      tokens: { input: 0, output: 0 },
    },
    previous: { micros: totals.previousMicros },
  } as UsageOverview
}

function renderStats(
  usage: UsageOverview | undefined,
  onDaysChange: (days: UsageDays) => void = () => undefined,
  days: UsageDays = 30
) {
  render(<UsageStats days={days} onDaysChange={onDaysChange} usage={usage} />)
}

test("the band leads with the window's spend and how it changed", () => {
  renderStats(
    overview({ micros: 128_000, ended: 42, failed: 0, previousMicros: 100_000 })
  )

  expect(screen.getByText("$0.13")).toBeDefined()
  expect(screen.getByText("+$0.03 vs the previous 30 days")).toBeDefined()
  expect(screen.getByText("42")).toBeDefined()
})

test("spending less than last time reads as a fall, not a rise", () => {
  renderStats(
    overview({ micros: 100_000, ended: 1, failed: 0, previousMicros: 400_000 })
  )

  expect(screen.getByText("-$0.30 vs the previous 30 days")).toBeDefined()
})

test("an unchanged window says so rather than showing a zero", () => {
  renderStats(
    overview({ micros: 50_000, ended: 1, failed: 0, previousMicros: 50_000 })
  )

  expect(screen.getByText("Level with the previous 30 days")).toBeDefined()
})

test("failures only take the alarming colour once there are any", () => {
  renderStats(
    overview({ micros: 1000, ended: 4, failed: 0, previousMicros: 0 })
  )

  expect(screen.getByText("0").className).toContain("text-muted-foreground")

  cleanup()
  renderStats(
    overview({ micros: 1000, ended: 4, failed: 2, previousMicros: 0 })
  )

  expect(screen.getByText("2").className).toContain("text-destructive")
})

test("figures line up as tabular numerals", () => {
  renderStats(
    overview({ micros: 1000, ended: 4, failed: 0, previousMicros: 0 })
  )

  expect(screen.getByText("4").className).toContain("tabular-nums")
})

test("the control stands ready while the figures are still loading", () => {
  renderStats(undefined)

  expect(screen.getAllByText("—")).toHaveLength(3)
  expect(screen.getByRole("radio", { name: "30 days" })).toBeDefined()
})

test("picking a window hands back the number of days", () => {
  const onDaysChange = vi.fn()

  renderStats(
    overview({ micros: 0, ended: 0, failed: 0, previousMicros: 0 }),
    onDaysChange,
    30
  )
  fireEvent.click(screen.getByRole("radio", { name: "90 days" }))

  expect(onDaysChange).toHaveBeenCalledWith(90)
})
