// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { UsageStats } from "./stats"
import { type UsageOverview } from "./types"

afterEach(cleanup)

type Figures = { micros: number; ended: number; failed: number }

function overview(totals: Figures, previous: Partial<Figures> = {}) {
  const window = (figures: Figures) => ({
    ...figures,
    tokens: { input: 0, output: 0 },
  })

  return {
    totals: window(totals),
    previous: window({ micros: 0, ended: 0, failed: 0, ...previous }),
  } as UsageOverview
}

function renderStats(usage: UsageOverview | undefined) {
  return render(<UsageStats usage={usage} />)
}

test("the band leads with the window's spend and how it changed", () => {
  const { container } = renderStats(
    overview(
      { micros: 135_000, ended: 42, failed: 0 },
      { micros: 100_000, ended: 40 }
    )
  )

  expect(screen.getByText("$0.14")).toBeDefined()
  expect(screen.getByText("35%")).toBeDefined()
  expect(screen.getByText("5%")).toBeDefined()
  // Spend, runs, and the cost of a run all rose.
  expect(container.querySelectorAll("svg.lucide-arrow-up")).toHaveLength(3)
})

test("spending less than last time reads as a fall, not a rise", () => {
  const { container } = renderStats(
    overview({ micros: 90_000, ended: 1, failed: 0 }, { micros: 100_000 })
  )

  expect(screen.getByText("10%")).toBeDefined()
  expect(container.querySelector("svg.lucide-arrow-down")).not.toBeNull()
})

test("an unchanged window says so rather than showing a zero", () => {
  renderStats(
    overview({ micros: 50_000, ended: 1, failed: 0 }, { micros: 50_000 })
  )

  expect(screen.getByText("No change")).toBeDefined()
})

test("a window with nothing before it has no change to report", () => {
  const { container } = renderStats(
    overview({ micros: 50_000, ended: 5, failed: 0 })
  )

  expect(screen.queryByText(/%/)).toBeNull()
  expect(container.querySelector("svg")).toBeNull()
})

test("failures are read as a share of the runs, and coloured once there are any", () => {
  renderStats(overview({ micros: 1000, ended: 4, failed: 0 }))

  expect(screen.getByText("0").className).toContain("text-muted-foreground")
  expect(screen.queryByText(/of runs/)).toBeNull()

  cleanup()
  renderStats(overview({ micros: 1000, ended: 26, failed: 2 }))

  expect(screen.getByText("2").className).toContain("text-destructive")
  expect(screen.getByText("8% of runs")).toBeDefined()
})

test("cost per run averages the window and moves against the one before", () => {
  renderStats(
    overview(
      { micros: 900_000, ended: 3, failed: 0 },
      { micros: 1_000_000, ended: 2 }
    )
  )

  // $0.30 a run, down from $0.50.
  expect(screen.getByText("$0.30")).toBeDefined()
  expect(screen.getByText("40%")).toBeDefined()
})

test("no runs means no cost per run to average", () => {
  renderStats(overview({ micros: 0, ended: 0, failed: 0 }))

  expect(screen.getAllByText("—")).toHaveLength(1)
})

test("the band keeps its four places while the figures are still loading", () => {
  renderStats(undefined)

  expect(screen.getAllByText("—")).toHaveLength(4)
  expect(screen.getByText("Cost / run")).toBeDefined()
})
