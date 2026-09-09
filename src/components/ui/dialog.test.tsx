// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { afterEach, expect, test, vi } from "vitest"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "./alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu"

let mobile = false

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mobile,
}))

afterEach(() => {
  cleanup()
  mobile = false
})

test("dialogs use a modal surface on desktop", () => {
  render(
    <Dialog open>
      <DialogContent>
        <DialogTitle>Profile</DialogTitle>
        <DialogDescription>Edit your profile.</DialogDescription>
      </DialogContent>
    </Dialog>
  )

  expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeNull()
  expect(document.querySelector('[data-slot="drawer-content"]')).toBeNull()
})

test("dialogs use handled drawers on mobile", () => {
  mobile = true

  render(
    <Dialog open>
      <DialogContent>
        <DialogTitle>Profile</DialogTitle>
        <DialogDescription>Edit your profile.</DialogDescription>
      </DialogContent>
    </Dialog>
  )

  expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull()
  expect(document.querySelector('[data-slot="drawer-content"]')).not.toBeNull()
  expect(document.querySelector('[data-slot="drawer-handle"]')).not.toBeNull()
})

test("mobile nested drawers move focus into the active surface and restore it", async () => {
  mobile = true

  function Fixture() {
    const [nestedOpen, setNestedOpen] = useState(false)

    return (
      <Dialog open>
        <DialogContent>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Organization settings.</DialogDescription>
          <button type="button" onClick={() => setNestedOpen(true)}>
            Invite member
          </button>
          <Dialog open={nestedOpen} onOpenChange={setNestedOpen}>
            <DialogContent>
              <DialogTitle>Invite member</DialogTitle>
              <DialogDescription>Send an invitation.</DialogDescription>
              <input aria-label="Email" />
              <button type="button" onClick={() => setNestedOpen(false)}>
                Cancel
              </button>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>
    )
  }

  render(<Fixture />)

  const trigger = screen.getByRole("button", { name: "Invite member" })
  fireEvent.click(trigger)

  expect(document.querySelectorAll('[data-slot="drawer-content"]')).toHaveLength(2)
  expect(document.querySelectorAll('[data-slot="drawer-handle"]')).toHaveLength(2)

  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByLabelText("Email"))
  )
  expect(document.activeElement?.closest('[aria-hidden="true"]')).toBeNull()

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

  await waitFor(() => expect(document.activeElement).toBe(trigger))
  expect(document.activeElement?.closest('[aria-hidden="true"]')).toBeNull()
})

test("mobile drawers restore focus to a popup trigger after its action opens a drawer", async () => {
  mobile = true

  function Fixture() {
    const [nestedOpen, setNestedOpen] = useState(false)

    return (
      <Dialog open>
        <DialogContent>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Organization settings.</DialogDescription>
          <DropdownMenu>
            <DropdownMenuTrigger>Member actions</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setNestedOpen(true)}>
                Remove member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={nestedOpen} onOpenChange={setNestedOpen}>
            <DialogContent>
              <DialogTitle>Remove member</DialogTitle>
              <DialogDescription>This cannot be undone.</DialogDescription>
              <button type="button" onClick={() => setNestedOpen(false)}>
                Cancel
              </button>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>
    )
  }

  render(<Fixture />)

  const trigger = screen.getByRole("button", { name: "Member actions" })
  trigger.focus()
  fireEvent.keyDown(trigger, { key: "ArrowDown" })
  fireEvent.click(screen.getByRole("menuitem", { name: "Remove member" }))

  const cancel = screen.getByRole("button", { name: "Cancel" })
  await waitFor(() => expect(document.activeElement).toBe(cancel))
  expect(document.activeElement?.closest('[aria-hidden="true"]')).toBeNull()

  fireEvent.click(cancel)

  await waitFor(() => expect(document.activeElement).toBe(trigger))
  expect(document.activeElement?.closest('[aria-hidden="true"]')).toBeNull()
})

test("alert dialogs retain explicit actions in mobile drawers", async () => {
  mobile = true
  const onOpenChange = vi.fn()

  render(
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogTitle>Delete?</AlertDialogTitle>
        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        <AlertDialogAction>Delete</AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>
  )

  expect(document.querySelector('[data-slot="drawer-handle"]')).not.toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Delete" }))
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
})
