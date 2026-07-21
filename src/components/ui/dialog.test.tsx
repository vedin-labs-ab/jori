// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
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

test("mobile dialogs automatically stack nested drawers", () => {
  mobile = true

  render(
    <Dialog open>
      <DialogContent>
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>Organization settings.</DialogDescription>
        <Dialog open>
          <DialogContent>
            <DialogTitle>Billing</DialogTitle>
            <DialogDescription>Billing settings.</DialogDescription>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )

  expect(document.querySelectorAll('[data-slot="drawer-content"]')).toHaveLength(
    2
  )
  expect(document.querySelectorAll('[data-slot="drawer-handle"]')).toHaveLength(
    2
  )
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
