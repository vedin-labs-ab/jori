// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { MaterialActions } from "./actions"

afterEach(() => {
  cleanup()
})

test("active materials offer archive only", () => {
  renderActions({ archivedAt: undefined })

  openMenu()

  expect(screen.getByRole("menuitem", { name: "Archive" })).toBeDefined()
  expect(screen.queryByRole("menuitem", { name: "Restore" })).toBeNull()
  expect(screen.queryByRole("menuitem", { name: "Delete" })).toBeNull()
})

test("archived materials offer restore and permanent delete", () => {
  const onRestore = vi.fn()

  renderActions({ archivedAt: 1, onRestore })

  openMenu()
  expect(screen.getByRole("menuitem", { name: "Delete" })).toBeDefined()
  fireEvent.click(screen.getByRole("menuitem", { name: "Restore" }))

  expect(onRestore).toHaveBeenCalledOnce()
})

test("archive confirms before calling back", () => {
  const onDelete = vi.fn()

  renderActions({ archivedAt: undefined, onDelete })

  openMenu()
  fireEvent.click(screen.getByRole("menuitem", { name: "Archive" }))

  expect(onDelete).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole("button", { name: "Archive table" }))

  expect(onDelete).toHaveBeenCalledOnce()
})

function renderActions({
  archivedAt,
  onDelete = () => undefined,
  onRestore = () => undefined,
}: {
  archivedAt: number | undefined
  onDelete?: () => void
  onRestore?: () => void
}) {
  return render(
    <MaterialActions
      deleteDescription="Deletes everything."
      isDeleting={false}
      isRestoring={false}
      material={{ name: "Invoices", archivedAt }}
      noun="table"
      onDelete={onDelete}
      onRestore={onRestore}
    />
  )
}

function openMenu() {
  fireEvent.pointerDown(screen.getByRole("button", { name: /open actions/i }), {
    button: 0,
    ctrlKey: false,
  })
}
