// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { ConsoleHeaderActionsProvider } from "../../layout"
import { type UsageOverview } from "./types"
import { UsageView } from "./view"

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../../test/router")).Link,
}))

// The charts are Recharts, which needs a laid-out box jsdom never gives it;
// this view's job is which sections appear, not how the bars are drawn.
vi.mock("./chart", () => ({
  UsageCharts: () => <div data-testid="charts" />,
}))

afterEach(cleanup)

function overview(overrides: Partial<UsageOverview> = {}) {
  return {
    series: [
      { date: "2026-03-15", micros: 900, ended: 3, failed: 1, segments: {} },
    ],
    totals: {
      micros: 900,
      ended: 3,
      failed: 1,
      tokens: { input: 10, output: 2 },
    },
    previous: {
      micros: 0,
      ended: 0,
      failed: 0,
      tokens: { input: 0, output: 0 },
    },
    jobs: [
      {
        id: "jobs:1",
        label: "Morning digest",
        micros: 900,
        ended: 3,
        failed: 1,
      },
    ],
    folders: [
      { key: "direct", label: "Filed here", micros: 900, ended: 3, failed: 1 },
    ],
    ...overrides,
  } as UsageOverview
}

function renderView(usage: UsageOverview | undefined) {
  // The window control portals into the shell's header; here the document
  // itself stands in for that slot.
  render(
    <ConsoleHeaderActionsProvider slot={document.body}>
      <UsageView
        days={30}
        folderId={"folders:1" as never}
        onDaysChange={() => undefined}
        usage={usage}
      />
    </ConsoleHeaderActionsProvider>
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
      jobs: [],
    })
  )

  expect(screen.getByText("No usage in this window")).toBeDefined()
  expect(
    screen.getByText(
      "Runs from jobs and chats filed here will show up as they spend."
    )
  ).toBeDefined()
  expect(screen.queryByTestId("charts")).toBeNull()
})

test("a window with spend shows its sources and omits an empty subfolder breakdown", () => {
  renderView(overview())

  expect(screen.getByTestId("charts")).toBeDefined()
  expect(screen.getByRole("link", { name: "Morning digest" })).toBeDefined()
  expect(screen.getByText("Spend by source")).toBeDefined()
  expect(screen.queryByText("Spend by subfolder")).toBeNull()
})

test("each subfolder row drills into that folder's own usage", () => {
  renderView(
    overview({
      folders: [
        {
          key: "folders:2",
          folderId: "folders:2" as never,
          label: "Pipeline",
          micros: 700,
          ended: 2,
          failed: 0,
        },
      ],
    })
  )

  expect(screen.getByText("Spend by subfolder")).toBeDefined()
  expect(
    screen.getByRole("link", { name: "Pipeline" }).getAttribute("href")
  ).toBe("/folders/folders:2/usage?days=30")
})

test("loading keeps the window control and shows the spinner", () => {
  renderView(undefined)

  expect(screen.getByRole("combobox", { name: "Window" }).textContent).toBe(
    "Last 30 days"
  )
  expect(document.querySelector('[data-slot="spinner"]')).not.toBeNull()
})
