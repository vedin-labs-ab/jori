// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type ListControls } from "@/shared/console/list/controls"
import { type RowSelection } from "@/shared/console/list/selection"
import { fileListConfig } from "./manage"
import { FileTable } from "./table"
import { type FileRow } from "./types"

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../test/router")).Link,
}))

afterEach(cleanup)

function fileRow(overrides: Partial<FileRow> = {}) {
  return {
    fileId: "file-1",
    name: "costs.csv",
    mimeType: "text/csv",
    size: 42,
    visibility: { mode: "organization" },
    folderId: undefined,
    source: "upload",
    runId: undefined,
    ownerName: "Ada Lovelace",
    description: undefined,
    createdAt: Date.now() - 3_600_000,
    updatedAt: Date.now(),
    url: "https://files.example/costs.csv",
    ...overrides,
  } as FileRow
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

function renderTable(
  files: FileRow[],
  {
    controls = stubControls(),
    hasFilters = false,
  }: { controls?: ListControls; hasFilters?: boolean } = {}
) {
  render(
    <FileTable
      onAccess={vi.fn()}
      config={fileListConfig(files, undefined)}
      controls={controls}
      files={files}
      folders={undefined}
      hasFilters={hasFilters}
      isLoading={false}
      onDelete={() => undefined}
      onEdit={() => undefined}
      onMoveToFolder={() => undefined}
      onUpload={() => undefined}
      pendingFileId={undefined}
      selection={stubSelection()}
    />
  )
}

test("lists name, size, kind, times, and owner columns", () => {
  renderTable([fileRow()])

  for (const header of ["Name", "Size", "Created", "Last Updated"]) {
    expect(screen.getByRole("button", { name: header })).toBeDefined()
  }

  expect(screen.getByRole("button", { name: "Type" })).toBeDefined()
  expect(screen.getByRole("button", { name: "Folder" })).toBeDefined()
  expect(screen.getByRole("button", { name: "Owner" })).toBeDefined()
  expect(screen.getByRole("link", { name: "costs.csv" })).toBeDefined()
  expect(screen.getByText("42 B")).toBeDefined()
  expect(screen.getByText("Ada Lovelace")).toBeDefined()
})

test("header buttons drive the sort", () => {
  const toggleSort = vi.fn()
  renderTable([fileRow()], { controls: stubControls({ toggleSort }) })

  fireEvent.click(screen.getByRole("button", { name: "Size" }))

  expect(toggleSort.mock.calls).toEqual([["size"]])
})

test("filters that match nothing keep the header controls reachable", () => {
  renderTable([], { hasFilters: true })

  expect(screen.getByText("No matching files")).toBeDefined()
  expect(screen.getByRole("button", { name: "Type" })).toBeDefined()
})

test("an unfiltered empty list invites the first upload", () => {
  renderTable([])

  expect(screen.getByText("No files yet")).toBeDefined()
  expect(screen.getByRole("button", { name: /Upload file/ })).toBeDefined()
})
