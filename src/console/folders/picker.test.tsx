// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { FolderPicker } from "./picker"
import { subtreeFolderIds } from "./tree"
import { type FolderRow } from "./types"

afterEach(cleanup)

const folders = [
  row("finance", "Finance"),
  row("invoices", "Invoices", "finance"),
  row("ops", "Operations"),
] as FolderRow[]

function row(folderId: string, name: string, parentId?: string) {
  return {
    folderId,
    name,
    parentId,
    hasContents: false,
    createdAt: 1,
    updatedAt: 1,
  }
}

test("offers No folder first, then the nested tree", () => {
  render(
    <FolderPicker
      currentId={null}
      folders={folders}
      onSelect={vi.fn()}
      selectedId={null}
    />
  )

  const options = screen.getAllByRole("button")

  expect(options.map((option) => option.textContent)).toEqual([
    "No folder",
    "Finance",
    "Invoices",
    "Operations",
  ])
})

test("disables the moving folder's own subtree", () => {
  render(
    <FolderPicker
      currentId={null}
      disabledIds={subtreeFolderIds(folders, "finance")}
      folders={folders}
      onSelect={vi.fn()}
      selectedId={null}
    />
  )

  expect(screen.getByRole("button", { name: "Finance" })).toHaveProperty(
    "disabled",
    true
  )
  expect(screen.getByRole("button", { name: "Invoices" })).toHaveProperty(
    "disabled",
    true
  )
  expect(screen.getByRole("button", { name: "Operations" })).toHaveProperty(
    "disabled",
    false
  )
})

test("marks the current location and reports selections", () => {
  const onSelect = vi.fn()

  render(
    <FolderPicker
      currentId="finance"
      folders={folders}
      onSelect={onSelect}
      selectedId={null}
    />
  )

  expect(screen.getByRole("button", { name: /Finance/ }).textContent).toContain(
    "Current"
  )

  fireEvent.click(screen.getByRole("button", { name: "Operations" }))

  expect(onSelect).toHaveBeenCalledWith("ops")

  fireEvent.click(screen.getByRole("button", { name: "No folder" }))

  expect(onSelect).toHaveBeenCalledWith(null)
})
