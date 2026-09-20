// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { type ComponentProps } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type Editing, EditingContext } from "@/shared/console/edit/state"
import { absoluteTime } from "@/shared/console/time"
import { listControls } from "../../../../../test/list/controls"
import {
  emptySelection,
  idleSelectionActions,
} from "../../../../../test/list/selection"
import { type FileRow } from "../types"
import { FileTable } from "."
import { fileListConfig } from "./config"

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../../test/router")).Link,
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
    createdAt: Date.now() - 3_600_000,
    updatedAt: Date.now(),
    url: "https://files.example/costs.csv",
    ...overrides,
  } as FileRow
}

const editing = {
  begin: vi.fn(),
  claim: vi.fn(),
  close: vi.fn(),
  create: vi.fn(),
  edit: undefined,
  register: vi.fn(),
  save: vi.fn(),
} satisfies Editing

function renderTable(
  files: FileRow[],
  {
    controls = listControls(),
    hasFilters = false,
    ...props
  }: Partial<ComponentProps<typeof FileTable>> = {}
) {
  render(
    <EditingContext value={editing}>
      <TooltipProvider>
        <FileTable
          onAccess={vi.fn()}
          config={fileListConfig(undefined, files)}
          controls={controls}
          files={files}
          folders={undefined}
          hasFilters={hasFilters}
          isLoading={false}
          onDelete={() => undefined}
          onMoveToFolder={() => undefined}
          onUpload={() => undefined}
          pendingFileId={undefined}
          selection={emptySelection()}
          selectionActions={idleSelectionActions}
          {...props}
        />
      </TooltipProvider>
    </EditingContext>
  )
}

test("lists name, size, kind, times, and owner columns", () => {
  const file = fileRow()
  renderTable([file])

  for (const header of ["Name", "Size", "Created", "Last Updated"]) {
    expect(screen.getByRole("button", { name: header })).toBeDefined()
  }

  expect(screen.getByRole("button", { name: "Type" })).toBeDefined()
  expect(screen.getByRole("button", { name: "Folder" })).toBeDefined()
  expect(screen.getByRole("button", { name: "Owner" })).toBeDefined()
  expect(screen.getByRole("link", { name: "costs.csv" })).toBeDefined()
  expect(screen.getByText("42 B")).toBeDefined()
  expect(screen.getByText("Ada Lovelace")).toBeDefined()
  for (const at of [file.createdAt, file.updatedAt]) {
    const cell = screen.getByTitle(absoluteTime(at))
    expect(cell.tagName).toBe("TD")
    expect(cell.classList.contains("text-muted-foreground")).toBe(true)
  }
})

test("header buttons drive the sort", () => {
  const toggleSort = vi.fn()
  renderTable([fileRow()], { controls: listControls({ toggleSort }) })

  fireEvent.click(screen.getByRole("button", { name: "Size" }))

  expect(toggleSort.mock.calls).toEqual([["size"]])
})

test("filters that match nothing keep the header controls reachable", () => {
  renderTable([], { hasFilters: true })

  expect(screen.getByText("No matching files")).toBeDefined()
  expect(screen.getByRole("button", { name: "Type" })).toBeDefined()
})

test("an unfiltered empty list invites the first upload", () => {
  const onUpload = vi.fn()
  renderTable([], { onUpload })

  expect(screen.getByText("No files yet")).toBeDefined()
  expect(screen.getByRole("button", { name: /Upload file/ })).toBeDefined()
  fireEvent.click(screen.getByRole("button", { name: /Upload file/ }))
  expect(onUpload).toHaveBeenCalledOnce()
})

test("run files belong to Jori even when a person name is present", () => {
  renderTable([fileRow({ source: "run" })])

  expect(screen.getByText("Jori")).toBeDefined()
  expect(screen.queryByText("Ada Lovelace")).toBeNull()
})

test("loading hides stale rows and upload actions", () => {
  renderTable([fileRow()], { isLoading: true })

  expect(screen.getByRole("status", { name: "Loading page" })).toBeDefined()
  expect(screen.queryByRole("table")).toBeNull()
  expect(screen.queryByRole("button", { name: /Upload file/ })).toBeNull()
})

test("row actions target their file and disable mutations while pending", () => {
  const file = fileRow()
  renderTable([file])

  // Rename opens nothing: it hands the row to the editing session, which
  // turns the name into its input where the row is read.
  openMenu(file)
  fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }))
  expect(editing.begin).toHaveBeenCalledExactlyOnceWith(
    { id: file.fileId, kind: "file", name: file.name },
    "list"
  )

  cleanup()
  renderTable([file], { pendingFileId: file.fileId })
  openMenu(file)

  for (const name of ["Rename", "Audience…", "Move to folder…", "Delete"]) {
    expect(
      screen.getByRole("menuitem", { name }).getAttribute("aria-disabled")
    ).toBe("true")
  }
})

function openMenu(file: FileRow) {
  fireEvent.pointerDown(
    screen.getByRole("button", { name: `Open actions for ${file.name}` }),
    { button: 0, ctrlKey: false }
  )
}
