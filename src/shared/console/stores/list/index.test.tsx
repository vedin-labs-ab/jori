// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type ListControls } from "@/shared/console/list/controls"
import { listControls } from "../../../../../test/list/controls"
import { emptySelection } from "../../../../../test/list/selection"
import { type MaterialRemoval } from "../../materials/removal"
import { type StoreSummary } from "../types"
import { StoreList } from "."
import { storeListConfig } from "./config"

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../../test/router")).Link,
}))

afterEach(cleanup)

const removal = {
  removeMaterial: async () => undefined,
  removingId: undefined,
  restoreMaterial: async () => undefined,
  restoringId: undefined,
} as unknown as MaterialRemoval<StoreSummary>

function storeSummary(overrides: Partial<StoreSummary> = {}) {
  return {
    storeId: "store-1",
    name: "Settings",
    visibility: { mode: "organization" },
    ownerId: undefined,
    folderId: undefined,
    schema: { type: "object" },
    schemaHash: "hash",
    propertyCount: 3,
    version: 7,
    ownerName: "Ada Lovelace",
    createdAt: Date.now() - 3_600_000,
    updatedAt: Date.now(),
    archivedAt: undefined,
    ...overrides,
  } as StoreSummary
}

function renderList(
  stores: StoreSummary[],
  {
    controls = listControls(),
    hasFilters = false,
  }: { controls?: ListControls; hasFilters?: boolean } = {}
) {
  render(
    <TooltipProvider>
      <StoreList
        config={storeListConfig(undefined, stores)}
        controls={controls}
        folders={undefined}
        hasFilters={hasFilters}
        onAccess={() => undefined}
        onCreate={() => undefined}
        onEdit={() => undefined}
        onMoveToFolder={() => undefined}
        removal={removal}
        selection={emptySelection()}
        stores={stores}
        unauthorizedMessage={undefined}
      />
    </TooltipProvider>
  )
}

test("lists name, counts, times, and owner columns", () => {
  renderList([storeSummary()])

  for (const header of [
    "Name",
    "Properties",
    "Version",
    "Created",
    "Last Updated",
  ]) {
    expect(screen.getByRole("button", { name: header })).toBeDefined()
  }

  expect(screen.getByRole("button", { name: "Owner" })).toBeDefined()
  expect(screen.getByRole("link", { name: "Settings" })).toBeDefined()
  expect(screen.getByTitle("3 properties").textContent).toContain("3")
  expect(screen.getByTitle("7 writes").textContent).toContain("v7")
  expect(screen.getByText("Ada Lovelace")).toBeDefined()
})

test("header buttons drive the sort and expose the facet menus", () => {
  const toggleSort = vi.fn()
  renderList([storeSummary()], { controls: listControls({ toggleSort }) })

  fireEvent.click(screen.getByRole("button", { name: "Properties" }))

  expect(toggleSort.mock.calls).toEqual([["properties"]])
  expect(screen.getByRole("button", { name: "Folder" })).toBeDefined()
  expect(screen.getByRole("button", { name: "Owner" })).toBeDefined()
})

test("filters that match nothing keep the header controls reachable", () => {
  renderList([], { hasFilters: true })

  expect(screen.getByText("No matching stores")).toBeDefined()
  expect(screen.getByRole("button", { name: "Name" })).toBeDefined()
})

test("a never-written store reads plainly as v0", () => {
  renderList([storeSummary({ version: 0 })])

  expect(screen.getByTitle("0 writes").textContent).toContain("v0")
  expect(screen.queryByText("Not written yet")).toBeNull()
})

test("a store without a resolved owner reads as Jori's own", () => {
  renderList([storeSummary({ ownerName: undefined })])

  expect(screen.getByText("Jori")).toBeDefined()
  expect(screen.queryByText("Ada Lovelace")).toBeNull()
})

test("a long unbroken name renders inside a capped, truncating cell", () => {
  const longName = "quarterly-metrics-snapshot".repeat(8)
  renderList([storeSummary({ name: longName })])

  const link = screen.getByRole("link", { name: longName })
  expect(link.className).toContain("truncate")
  // The cap must be inside the cell — table cells ignore max-width during
  // auto-layout column sizing — with a shrinkable row around the link.
  expect(link.closest(".max-w-64")).not.toBeNull()
  expect(link.parentElement?.className).toContain("min-w-0")
})

test("visibility and archived marks ride the name cell", () => {
  renderList([
    storeSummary({
      visibility: { mode: "private" },
      archivedAt: Date.now(),
    }),
  ])

  expect(screen.getByText("Only me")).toBeDefined()
  expect(screen.getByText("Archived")).toBeDefined()
})

test("a row offers the store's whole menu, the way its page does", () => {
  renderList([storeSummary()])

  fireEvent.pointerDown(
    screen.getByRole("button", { name: "Open actions for Settings" }),
    { button: 0, ctrlKey: false }
  )

  expect(
    screen.getAllByRole("menuitem").map((item) => item.textContent)
  ).toEqual(["Rename…", "Visibility…", "Move to folder…", "Archive"])
})
