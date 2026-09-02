// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { UsageContributors, UsageFolders } from "./ranked"
import { type UsageContributor, type UsageSegment } from "./types"

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../../test/router")).Link,
}))

afterEach(cleanup)

function contributors(count: number): UsageContributor[] {
  return Array.from({ length: count }, (_unused, rank) => ({
    id: `jobs:${rank}` as UsageContributor["id"],
    label: `Digest ${rank}`,
    micros: (count - rank) * 100,
    ended: 1,
    failed: 0,
  }))
}

/** The ranking's rows: neither the header nor the line that opens the
 *  rest is one. */
function rows() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .filter((row) => row.querySelector("button") === null)
}

function cells(row: HTMLElement) {
  return [...row.querySelectorAll("td")].map((cell) => cell.textContent)
}

test("a ranking opens on its leaders and keeps the rest one click away", () => {
  render(<UsageContributors jobs={contributors(7)} total={2800} />)

  expect(rows()).toHaveLength(5)

  fireEvent.click(screen.getByRole("button", { name: "Show all 7" }))

  expect(rows()).toHaveLength(7)

  fireEvent.click(screen.getByRole("button", { name: "Show less" }))

  expect(rows()).toHaveLength(5)
})

test("a ranking short enough to read whole offers nothing to open", () => {
  render(<UsageContributors jobs={contributors(5)} total={1500} />)

  expect(rows()).toHaveLength(5)
  expect(screen.queryByRole("button")).toBeNull()
})

test("a source row reads its runs, its money, and its share of the window", () => {
  render(
    <UsageContributors
      jobs={[
        {
          id: "jobs:1" as UsageContributor["id"],
          label: "Morning digest",
          micros: 1_800_000,
          ended: 12,
          failed: 2,
        },
      ]}
      total={10_000_000}
    />
  )

  const [row] = rows()

  expect(cells(row as HTMLElement)).toEqual([
    "Morning digest",
    "12",
    "2",
    "$1.80",
    "$0.15",
    "18%",
  ])
  expect(screen.getByRole("link", { name: "Morning digest" })).toBeDefined()
  expect(screen.getByText("2").className).toContain("text-destructive")
})

test("a window that cost nothing has no shares or averages to report", () => {
  render(
    <UsageContributors
      jobs={[{ label: "Interactive work", micros: 0, ended: 0, failed: 0 }]}
      total={0}
    />
  )

  const [row] = rows()

  expect(cells(row as HTMLElement)).toEqual([
    "Interactive work",
    "0",
    "0",
    "$0.00",
    "—",
    "—",
  ])
  expect(screen.queryByRole("link")).toBeNull()
})

test("the scope's own bucket ranks as a row like any other, with no way in", () => {
  render(
    <UsageFolders
      days={30}
      segments={[
        ...segments(5),
        {
          key: "direct",
          label: "Unfiled",
          micros: 1_000_000,
          ended: 4,
          failed: 0,
        },
      ]}
      total={10_000_000}
    />
  )

  expect(rows()).toHaveLength(5)

  fireEvent.click(screen.getByRole("button", { name: "Show all 6" }))

  const unfiled = rows().at(-1)

  expect(cells(unfiled as HTMLElement)).toEqual([
    "Unfiled",
    "4",
    "0",
    "$1.00",
    "$0.25",
    "10%",
  ])
  expect(screen.queryByRole("link", { name: "Unfiled" })).toBeNull()
})

test("a folder row is a way further in, reads like a source row, and wears its colour", () => {
  render(<UsageFolders days={30} segments={segments(1)} total={4_000_000} />)

  const [row] = rows()

  // The row carries the window into the folder's own usage page.
  expect(
    screen.getByRole("link", { name: "Folder 0" }).getAttribute("href")
  ).toBe("/folders/folders:0/usage?days=30")
  expect(cells(row as HTMLElement)).toEqual([
    "Folder 0",
    "2",
    "0",
    "$1.00",
    "$0.50",
    "25%",
  ])
  expect(
    (row as HTMLElement)
      .querySelector("span[aria-hidden]")
      ?.getAttribute("style")
  ).toContain("var(--chart-1)")
})

function segments(count: number): UsageSegment[] {
  return Array.from({ length: count }, (_unused, rank) => ({
    key: `folders:${rank}`,
    folderId: `folders:${rank}` as UsageSegment["folderId"],
    label: `Folder ${rank}`,
    micros: 1_000_000,
    ended: 2,
    failed: 0,
  }))
}
