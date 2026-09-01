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

/** The body's rows: the header row is not a ranking. */
function rows() {
  return screen.getAllByRole("row").slice(1)
}

function cells(row: HTMLElement) {
  return [...row.querySelectorAll("td")].map((cell) => cell.textContent)
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

test("a source row reads its runs, its money, and its share of the window", () => {
  render(
    <UsageContributors
      automations={[
        {
          id: "automations:1" as UsageContributor["id"],
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
      automations={[
        { label: "Interactive work", micros: 0, ended: 0, failed: 0 },
      ]}
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

test("the unfiled bucket ranks as a row like any other", () => {
  render(
    <UsageFolders
      days={30}
      folders={folders(5)}
      total={10_000_000}
      unfiled={
        {
          micros: 1_000_000,
          ended: 4,
          failed: 0,
          tokens: { input: 0, output: 0 },
        } as UsageOverview["unfiled"]
      }
    />
  )

  expect(rows()).toHaveLength(5)

  fireEvent.click(screen.getByRole("button", { name: "Show all 6" }))

  const unfiled = rows().at(-1)

  expect(cells(unfiled as HTMLElement)).toEqual(["Unfiled", "$1.00", "10%"])
})

test("a folder row is a way further in, with its share beside it", () => {
  render(
    <UsageFolders
      days={30}
      folders={folders(1)}
      total={4_000_000}
      unfiled={null}
    />
  )

  expect(
    screen.getByRole("link", { name: "Folder 0" }).getAttribute("href")
  ).toBe("/folders/folders:0/usage")
  expect(screen.getByText("25%")).toBeDefined()
})

function folders(count: number) {
  return Array.from({ length: count }, (_unused, rank) => ({
    folderId: `folders:${rank}` as UsageOverview["folders"][number]["folderId"],
    name: `Folder ${rank}`,
    micros: 1_000_000,
  }))
}
