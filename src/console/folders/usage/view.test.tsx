// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type UsageOverview } from "./types"
import { UsageView } from "./view"

const { payload } = vi.hoisted(() => ({
  payload: { current: undefined as UsageOverview | undefined },
}))

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../test/router")).Link,
}))

// Both the overview and the spend chart's slice read through this; the
// view's own assertions are about the overview, and the spend chart is
// mocked away, so one payload answers for both.
vi.mock("convex/react", () => ({ useQuery: () => payload.current }))

// The charts are Recharts, which needs a laid-out box jsdom never gives it;
// this view's job is which sections appear, not how the bars are drawn.
vi.mock("./chart", () => ({
  UsageRunsChart: () => <div data-testid="runs-chart" />,
  UsageSpendChart: () => <div data-testid="spend-chart" />,
}))

afterEach(cleanup)

function overview(overrides: Partial<UsageOverview> = {}) {
  return {
    series: [{ date: "2026-03-15", micros: 900, ended: 3, failed: 1 }],
    totals: {
      micros: 900,
      ended: 3,
      failed: 1,
      tokens: { input: 10, output: 2 },
    },
    previous: { micros: 0 },
    automations: [
      {
        id: "automations:1",
        label: "Morning digest",
        micros: 900,
        ended: 3,
        failed: 1,
      },
    ],
    folders: [],
    unfiled: null,
    timezone: "Europe/Stockholm",
    ...overrides,
  } as UsageOverview
}

function renderView(usage: UsageOverview | undefined) {
  payload.current = usage

  render(
    <UsageView
      days={30}
      folderId={"folders:1" as never}
      onDaysChange={() => undefined}
      organizationId="organization"
    />
  )
}

test("a window with nothing in it explains itself instead of drawing zeroes", () => {
  renderView(
    overview({
      totals: {
        micros: 0,
        ended: 0,
        failed: 0,
        tokens: { input: 0, output: 0 },
      },
      automations: [],
    })
  )

  expect(screen.getByText("No usage in this window")).toBeDefined()
  expect(
    screen.getByText(
      "Runs from automations filed here will show up as they spend."
    )
  ).toBeDefined()
  expect(screen.queryByTestId("spend-chart")).toBeNull()
})

test("a window with spend draws both charts and names what spent it", () => {
  renderView(overview())

  expect(screen.getByTestId("spend-chart")).toBeDefined()
  expect(screen.getByTestId("runs-chart")).toBeDefined()
  expect(screen.getByRole("link", { name: "Morning digest" })).toBeDefined()
  expect(screen.getByText("Automations")).toBeDefined()
})

test("nothing below this folder means no drill-down to offer", () => {
  renderView(overview())

  expect(screen.queryByText("Subfolders")).toBeNull()
})

test("each subfolder row drills into that folder's own usage", () => {
  renderView(
    overview({
      folders: [
        { folderId: "folders:2" as never, name: "Pipeline", micros: 700 },
      ],
    })
  )

  expect(screen.getByText("Subfolders")).toBeDefined()
  expect(
    screen.getByRole("link", { name: "Pipeline" }).getAttribute("href")
  ).toBe("/folders/folders:2/usage")
})

test("the footnote says whose day a day is and what the money buys", () => {
  renderView(overview())

  expect(screen.getByText(/Days follow Europe\/Stockholm/)).toBeDefined()
  expect(screen.getByText(/priced at provider list rates/)).toBeDefined()
})

test("loading keeps the window control and shows the spinner", () => {
  renderView(undefined)

  expect(screen.getByRole("radio", { name: "30 days" })).toBeDefined()
  expect(document.querySelector('[data-slot="spinner"]')).not.toBeNull()
})
