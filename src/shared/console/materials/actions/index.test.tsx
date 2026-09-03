// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { MaterialRowMenu } from "./menu"

afterEach(() => {
  cleanup()
})

test("a row offers the whole material menu, in order", () => {
  renderMenu({ archivedAt: undefined })

  openMenu()

  expect(
    screen.getAllByRole("menuitem").map((item) => item.textContent)
  ).toEqual(["Rename…", "Visibility…", "Move to folder…", "Archive"])
})

test("active materials offer archive only", () => {
  renderMenu({ archivedAt: undefined })

  openMenu()

  expect(screen.getByRole("menuitem", { name: "Archive" })).toBeDefined()
  expect(screen.queryByRole("menuitem", { name: "Restore" })).toBeNull()
  expect(screen.queryByRole("menuitem", { name: "Delete" })).toBeNull()
})

test("archived materials offer restore and permanent delete", () => {
  const onRestore = vi.fn()

  renderMenu({ archivedAt: 1, onRestore })

  openMenu()
  expect(screen.getByRole("menuitem", { name: "Delete" })).toBeDefined()
  fireEvent.click(screen.getByRole("menuitem", { name: "Restore" }))

  expect(onRestore).toHaveBeenCalledOnce()
})

test("archive confirms before calling back", () => {
  const onDelete = vi.fn()

  renderMenu({ archivedAt: undefined, onDelete })

  openMenu()
  fireEvent.click(screen.getByRole("menuitem", { name: "Archive" }))

  expect(onDelete).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole("button", { name: "Archive table" }))

  expect(onDelete).toHaveBeenCalledOnce()
})

test("a folder listing adds unfiling right after the move", () => {
  const onUnfile = vi.fn()

  renderMenu({ archivedAt: undefined, onUnfile })

  openMenu()
  const labels = screen.getAllByRole("menuitem").map((item) => item.textContent)

  expect(labels).toEqual([
    "Rename…",
    "Visibility…",
    "Move to folder…",
    "Remove from folder",
    "Archive",
  ])

  fireEvent.click(screen.getByRole("menuitem", { name: "Remove from folder" }))

  expect(onUnfile).toHaveBeenCalledOnce()
})

function renderMenu({
  archivedAt,
  onDelete = () => undefined,
  onRestore = () => undefined,
  onUnfile,
}: {
  archivedAt: number | undefined
  onDelete?: () => void
  onRestore?: () => void
  onUnfile?: () => void
}) {
  return render(
    <MaterialRowMenu
      deleteDescription="Deletes everything."
      isDeleting={false}
      isRestoring={false}
      material={{ name: "Invoices", archivedAt }}
      noun="table"
      onAccess={() => undefined}
      onDelete={onDelete}
      onEdit={() => undefined}
      onMoveToFolder={() => undefined}
      onRestore={onRestore}
      onUnfile={onUnfile}
    />
  )
}

function openMenu() {
  fireEvent.pointerDown(screen.getByRole("button", { name: /open actions/i }), {
    button: 0,
    ctrlKey: false,
  })
}
