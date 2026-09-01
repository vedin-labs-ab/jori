// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { UsageContributors, UsageFolders } from "./ranked"
import { type UsageContributor, type UsageOverview } from "./types"

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../test/router")).Link,
}))

afterEach(cleanup)

function contributors(count: number): UsageContributor[] {
  return Array.from({ length: count }, (_unused, rank) => ({
    id: `automations:${rank}` as UsageContributor["id"],
    label: `Automation ${rank}`,
    micros: (count - rank) * 100,
    ended: 1,
    failed: 0,
  }))
}

function rows() {
  return screen.getAllByRole("listitem")
}

test("a ranking opens on its leaders and keeps the rest one click away", () => {
  render(<UsageContributors automations={contributors(7)} total={2800} />)

  expect(rows()).toHaveLength(5)

  fireEvent.click(screen.getByRole("button", { name: "Show all 7" }))

  expect(rows()).toHaveLength(7)

  fireEvent.click(screen.getByRole("button", { name: "Show less" }))

  expect(rows()).toHaveLength(5)
})

test("a ranking short enough to read whole offers nothing to open", () => {
  render(<UsageContributors automations={contributors(5)} total={1500} />)

  expect(rows()).toHaveLength(5)
  expect(screen.queryByRole("button")).toBeNull()
})

test("a row says what share of the window it is, then what it ran", () => {
  render(
    <UsageContributors
      automations={[
        {
          id: "automations:1" as UsageContributor["id"],
          label: "Morning digest",
          micros: 1800,
          ended: 12,
          failed: 2,
        },
      ]}
      total={10_000}
    />
  )

  expect(screen.getByText("18% of spend · 12 runs · 2 failed")).toBeDefined()
})

test("a window that cost nothing has no shares to report", () => {
  render(
    <UsageContributors
      automations={[
        { label: "Interactive work", micros: 0, ended: 3, failed: 0 },
      ]}
      total={0}
    />
  )

  expect(screen.getByText("3 runs")).toBeDefined()
})

test("the unfiled bucket ranks as a row like any other", () => {
  render(
    <UsageFolders
      days={30}
      folders={folders(5)}
      total={10_000}
      unfiled={
        {
          micros: 1000,
          ended: 4,
          failed: 0,
          tokens: { input: 0, output: 0 },
        } as UsageOverview["unfiled"]
      }
    />
  )

  expect(rows()).toHaveLength(5)

  fireEvent.click(screen.getByRole("button", { name: "Show all 6" }))

  expect(rows()).toHaveLength(6)
  expect(
    screen.getByText("10% of spend · 4 runs · not filed in any folder")
  ).toBeDefined()
})

test("a folder row carries its share where its runs would be", () => {
  render(
    <UsageFolders days={30} folders={folders(1)} total={4000} unfiled={null} />
  )

  expect(screen.getByText("25% of spend")).toBeDefined()
})

function folders(count: number) {
  return Array.from({ length: count }, (_unused, rank) => ({
    folderId: `folders:${rank}` as UsageOverview["folders"][number]["folderId"],
    name: `Folder ${rank}`,
    micros: 1000,
  }))
}
