// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type ListControls } from "@/shared/console/list/controls"
import { type RowSelection } from "@/shared/console/list/selection"
import { type TableSummary } from "@/shared/console/tables/types"
import { TableList } from "./list"
import { tableListConfig, type useTableRemoval } from "./manage"

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../test/router")).Link,
}))

afterEach(cleanup)

const removal = {
  removeMaterial: async () => undefined,
  removingId: undefined,
  restoreMaterial: async () => undefined,
  restoringId: undefined,
} as unknown as ReturnType<typeof useTableRemoval>

function tableSummary(overrides: Partial<TableSummary> = {}) {
  return {
    tableId: "table-1",
    name: "Leads",
    description: undefined,
    visibility: { mode: "organization" },
    ownerId: undefined,
    folderId: undefined,
    columns: [
      { id: "title", name: "Title", type: "string" },
      { id: "stage", name: "Stage", type: "string" },
    ],
    rowCount: 12,
    ownerName: "Ada Lovelace",
    createdAt: Date.now() - 3_600_000,
    updatedAt: Date.now(),
    archivedAt: undefined,
    ...overrides,
  } as TableSummary
}

function stubSelection<Row>(): RowSelection<Row> {
  return {
    allSelected: false,
    clear: () => undefined,
    count: 0,
    isSelected: () => false,
    selected: [],
    toggle: () => undefined,
    toggleAll: () => undefined,
  }
}

function stubControls(overrides: Partial<ListControls> = {}): ListControls {
  return {
    getFacet: () => undefined,
    hasActiveControls: false,
    isFacetActive: () => false,
    setFacet: () => undefined,
    sort: undefined,
    toggleSort: () => undefined,
    ...overrides,
  }
}

function renderList(
  tables: TableSummary[],
  {
    controls = stubControls(),
    hasFilters = false,
  }: { controls?: ListControls; hasFilters?: boolean } = {}
) {
  render(
    <TableList
      config={tableListConfig(undefined, tables)}
      controls={controls}
      folders={undefined}
      hasFilters={hasFilters}
      onAccess={() => undefined}
      onCreate={() => undefined}
      onEdit={() => undefined}
      onImport={() => undefined}
      onMoveToFolder={() => undefined}
      removal={removal}
      selection={stubSelection()}
      tables={tables}
      unauthorizedMessage={undefined}
    />
  )
}

test("lists name, counts, times, and owner columns", () => {
  renderList([tableSummary()])

  for (const header of ["Name", "Columns", "Rows", "Created", "Last Updated"]) {
    expect(screen.getByRole("button", { name: header })).toBeDefined()
  }

  expect(screen.getByRole("button", { name: "Owner" })).toBeDefined()
  expect(screen.getByRole("link", { name: "Leads" })).toBeDefined()
  expect(screen.getByTitle("2 columns").textContent).toContain("2")
  expect(screen.getByTitle("12 rows").textContent).toContain("12")
  expect(screen.getByText("Ada Lovelace")).toBeDefined()
})

test("header buttons drive the sort and expose the facet menus", () => {
  const toggleSort = vi.fn()
  renderList([tableSummary()], { controls: stubControls({ toggleSort }) })

  fireEvent.click(screen.getByRole("button", { name: "Name" }))
  fireEvent.click(screen.getByRole("button", { name: "Rows" }))

  expect(toggleSort.mock.calls).toEqual([["name"], ["rows"]])
  expect(screen.getByRole("button", { name: "Folder" })).toBeDefined()
  expect(screen.getByRole("button", { name: "Owner" })).toBeDefined()
})

test("filters that match nothing keep the header controls reachable", () => {
  renderList([], { hasFilters: true })

  expect(screen.getByText("No matching tables")).toBeDefined()
  expect(screen.getByRole("button", { name: "Name" })).toBeDefined()
})

test("a table without a resolved owner reads as Jori's own", () => {
  renderList([tableSummary({ ownerName: undefined })])

  expect(screen.getByText("Jori")).toBeDefined()
  expect(screen.queryByText("Ada Lovelace")).toBeNull()
})

test("visibility and archived marks ride the name cell", () => {
  renderList([
    tableSummary({
      visibility: { mode: "private" },
      archivedAt: Date.now(),
    }),
  ])

  expect(screen.getByText("Only me")).toBeDefined()
  expect(screen.getByText("Archived")).toBeDefined()
})

test("a row offers the table's whole menu, the way its page does", () => {
  renderList([tableSummary()])

  fireEvent.pointerDown(
    screen.getByRole("button", { name: "Open actions for Leads" }),
    { button: 0, ctrlKey: false }
  )

  expect(
    screen.getAllByRole("menuitem").map((item) => item.textContent)
  ).toEqual(["Edit details", "Sharing…", "Move to folder…", "Archive"])
})
