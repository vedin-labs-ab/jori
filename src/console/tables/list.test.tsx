// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type RowSelection } from "../shared/list/selection"
import { TableList } from "./list"
import { type useTableRemoval } from "./manage"
import { type TableSummary } from "./types"

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    params,
    to,
    ...props
  }: {
    params?: Record<string, string>
    to: string
  } & React.ComponentProps<"a">) => (
    <a
      href={Object.values(params ?? {}).reduce(
        (path, value) => path.replace(/\$\w+/, value),
        to
      )}
      {...props}
    />
  ),
}))

afterEach(cleanup)

const removal = {
  removeTable: async () => undefined,
  removingTableId: undefined,
  restoreTable: async () => undefined,
  restoringTableId: undefined,
} as unknown as ReturnType<typeof useTableRemoval>

function tableSummary(overrides: Partial<TableSummary> = {}) {
  return {
    tableId: "table-1",
    name: "Leads",
    description: undefined,
    scope: "organization",
    ownerId: undefined,
    folderId: undefined,
    columns: [
      { key: "title", name: "Title", type: "string" },
      { key: "stage", name: "Stage", type: "string" },
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

function renderList(tables: TableSummary[]) {
  render(
    <TableList
      folders={undefined}
      hasFilters={false}
      onCreate={() => undefined}
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

  for (const header of [
    "Name",
    "Columns",
    "Rows",
    "Created",
    "Owner",
    "Last Updated",
  ]) {
    expect(screen.getByRole("columnheader", { name: header })).toBeDefined()
  }

  expect(screen.getByRole("link", { name: "Leads" })).toBeDefined()
  expect(screen.getByTitle("2 columns").textContent).toContain("2")
  expect(screen.getByTitle("12 rows").textContent).toContain("12")
  expect(screen.getByText("Ada Lovelace")).toBeDefined()
})

test("a table without a resolved owner reads as Jori's own", () => {
  renderList([tableSummary({ ownerName: undefined })])

  expect(screen.getByText("Jori")).toBeDefined()
  expect(screen.queryByText("Ada Lovelace")).toBeNull()
})

test("personal and archived marks ride the name cell", () => {
  renderList([
    tableSummary({
      scope: "personal",
      archivedAt: Date.now(),
      description: "Weekly pipeline",
    }),
  ])

  expect(screen.getByText("Personal")).toBeDefined()
  expect(screen.getByText("Archived")).toBeDefined()
  expect(screen.getByText("Weekly pipeline")).toBeDefined()
})
