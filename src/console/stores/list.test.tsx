// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type RowSelection } from "../shared/list/selection"
import { StoreList } from "./list"
import { type useStoreRemoval } from "./manage"
import { type StoreSummary } from "./types"

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
  removeStore: async () => undefined,
  removingStoreId: undefined,
  restoreStore: async () => undefined,
  restoringStoreId: undefined,
} as unknown as ReturnType<typeof useStoreRemoval>

function storeSummary(overrides: Partial<StoreSummary> = {}) {
  return {
    storeId: "store-1",
    name: "Settings",
    description: undefined,
    scope: "organization",
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

function renderList(stores: StoreSummary[]) {
  render(
    <StoreList
      folders={undefined}
      hasFilters={false}
      onCreate={() => undefined}
      onMoveToFolder={() => undefined}
      removal={removal}
      selection={stubSelection()}
      stores={stores}
      unauthorizedMessage={undefined}
    />
  )
}

test("lists name, counts, times, and owner columns", () => {
  renderList([storeSummary()])

  for (const header of [
    "Name",
    "Properties",
    "Version",
    "Created",
    "Owner",
    "Last Updated",
  ]) {
    expect(screen.getByRole("columnheader", { name: header })).toBeDefined()
  }

  expect(screen.getByRole("link", { name: "Settings" })).toBeDefined()
  expect(screen.getByTitle("3 properties").textContent).toContain("3")
  expect(screen.getByTitle("7 writes").textContent).toContain("v7")
  expect(screen.getByText("Ada Lovelace")).toBeDefined()
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

test("personal and archived marks ride the name cell", () => {
  renderList([
    storeSummary({
      scope: "personal",
      archivedAt: Date.now(),
      description: "Org-wide defaults",
    }),
  ])

  expect(screen.getByText("Personal")).toBeDefined()
  expect(screen.getByText("Archived")).toBeDefined()
  expect(screen.getByText("Org-wide defaults")).toBeDefined()
})
