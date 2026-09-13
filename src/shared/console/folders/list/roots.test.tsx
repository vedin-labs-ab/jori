// @vitest-environment jsdom

import { DndContext } from "@dnd-kit/core"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type FolderDialogRequest, type FolderRootsResult } from "../types"
import { RootFolderList } from "./roots"
import { type FolderSelectionActions } from "./select"

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../../test/router")).Link,
}))

afterEach(cleanup)

function folderRow(overrides: Record<string, unknown>) {
  return {
    folderId: "folder-1",
    name: "Guides",
    parentId: undefined,
    visibility: { mode: "organization" },
    createdBy: "persons:owner",
    createdAt: 1,
    updatedAt: Date.now(),
    folderCount: 0,
    resourceCount: 0,
    ownerId: "persons:owner",
    ownerName: "Ada Lovelace",
    ...overrides,
  }
}

function renderList(
  roots: FolderRootsResult | undefined,
  {
    onDialog = () => undefined,
    selectionActions = stubSelectionActions(),
  }: {
    onDialog?: (request: FolderDialogRequest) => void
    selectionActions?: FolderSelectionActions
  } = {}
) {
  render(
    <TooltipProvider>
      <DndContext>
        <RootFolderList
          onCreate={() => undefined}
          onDialog={onDialog}
          roots={roots}
          selectionActions={selectionActions}
        />
      </DndContext>
    </TooltipProvider>
  )
}

function stubSelectionActions(): FolderSelectionActions {
  return { isBusy: false, onMove: vi.fn(), onRemove: vi.fn() }
}

test("root folders land in the same table as a folder's contents", () => {
  renderList({
    status: "ready",
    folders: [folderRow({ folderCount: 2, resourceCount: 3 })],
  } as FolderRootsResult)

  for (const header of ["Name", "Kind", "Owner", "Items", "Updated"]) {
    expect(screen.getByRole("columnheader", { name: header })).toBeDefined()
  }

  const root = screen.getByRole("link", { name: "Guides" })
  expect(root.getAttribute("href")).toBe("/folders/folder-1")
  // The Owner column names whoever created the folder.
  expect(screen.getByText("Ada Lovelace")).toBeDefined()
  expect(root.querySelector(".lucide-folder")).not.toBeNull()
  // One combined number; the tooltip carries the breakdown.
  const items = screen.getByTitle("2 folders, 3 resources")
  expect(items.textContent).toContain("5")
})

test("loading shows the centered spinner instead of a table", () => {
  renderList(undefined)

  expect(screen.queryByRole("table")).toBeNull()
  expect(document.querySelector('[data-slot="spinner"]')).not.toBeNull()
})

test("an unauthorized result surfaces its message", () => {
  renderList({
    status: "unauthorized",
    message: "No seat on this organization.",
    folders: [],
  } as FolderRootsResult)

  expect(screen.getByText("No seat on this organization.")).toBeDefined()
  expect(screen.queryByRole("table")).toBeNull()
})

test("no folders yet introduces the surface with a create action", () => {
  renderList({ status: "ready", folders: [] } as unknown as FolderRootsResult)

  expect(screen.getByText("No folders yet")).toBeDefined()
  expect(screen.getByRole("button", { name: /New folder/ })).toBeDefined()
})

test("a root folder row opens the folder's own menu", () => {
  const onDialog = vi.fn()

  renderList(
    { status: "ready", folders: [folderRow({})] } as FolderRootsResult,
    { onDialog }
  )
  fireEvent.pointerDown(
    screen.getByRole("button", { name: "Open actions for Guides" }),
    { button: 0, ctrlKey: false }
  )

  expect(
    screen.getAllByRole("menuitem").map((item) => item.textContent)
  ).toEqual(["Usage", "Rename", "Audience…", "Move to folder…", "Delete"])

  fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }))

  expect(onDialog).toHaveBeenCalledWith({
    type: "rename",
    folder: expect.objectContaining({ folderId: "folder-1" }),
  })
})

test("selecting root folders offers a move and a delete over them", () => {
  const selectionActions = stubSelectionActions()

  renderList(
    {
      status: "ready",
      folders: [
        folderRow({}),
        folderRow({ folderId: "folder-2", name: "Playbooks" }),
      ],
    } as FolderRootsResult,
    { selectionActions }
  )

  expect(screen.queryByRole("toolbar")).toBeNull()

  fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }))

  expect(screen.getByText("2 selected")).toBeDefined()
  fireEvent.click(screen.getByRole("button", { name: "Move" }))

  expect(selectionActions.onMove).toHaveBeenCalledWith({
    folders: [
      { folderId: "folder-1", name: "Guides", parentId: undefined },
      { folderId: "folder-2", name: "Playbooks", parentId: undefined },
    ],
    resources: [],
  })

  fireEvent.click(screen.getByRole("button", { name: "Delete" }))
  fireEvent.click(screen.getByRole("button", { name: "Delete" }))

  expect(selectionActions.onRemove).toHaveBeenCalledWith({
    folders: [
      expect.objectContaining({ folderId: "folder-1" }),
      expect.objectContaining({ folderId: "folder-2" }),
    ],
    resources: [],
  })
})
