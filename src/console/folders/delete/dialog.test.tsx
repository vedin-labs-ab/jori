// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { type ManagedFolder } from "../types"
import { DeleteFolderDialog } from "./dialog"

// The dialog is the only place the subtree's size is stated, and the only
// gate in front of a delete that cannot be undone.

const mutate = vi.fn()
let impact: unknown

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useMutation: () => mutate,
  useQuery: () => impact,
}))

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }))

afterEach(cleanup)

beforeEach(() => {
  mutate.mockReset()
  mutate.mockResolvedValue(null)
  impact = {
    status: "ready",
    folderCount: 2,
    parentName: "Operations",
    resourceCount: 3,
  }
})

const folder = {
  createdBy: "persons:owner",
  folderId: "folders:1",
  name: "Finance",
  visibility: { mode: "organization" },
} as unknown as ManagedFolder

function renderDialog() {
  render(
    <DeleteFolderDialog
      folder={folder}
      isOpen
      onDeleted={() => undefined}
      onOpenChange={() => undefined}
      organizationId="org-1"
    />
  )
}

function deleteButton() {
  return screen.getByRole("button", {
    name: /^Delete folder/,
  }) as HTMLButtonElement
}

test("states the subtree it takes and where the contents land", () => {
  renderDialog()

  expect(screen.getByRole("alertdialog").textContent).toContain(
    'This deletes "Finance" and its 2 subfolders. Its 3 items move to "Operations".'
  )
})

test("the destructive button waits for the folder's name", () => {
  renderDialog()

  expect(deleteButton().disabled).toBe(true)

  fireEvent.change(screen.getByLabelText(/to confirm/), {
    target: { value: "Finance" },
  })

  expect(deleteButton().disabled).toBe(false)
})

test("choosing to delete the contents restates the outcome", () => {
  renderDialog()
  fireEvent.click(screen.getByLabelText(/Also permanently delete/))

  expect(screen.getByRole("alertdialog").textContent).toContain(
    "Its 3 items are deleted for good."
  )
  expect(deleteButton().textContent).toBe("Delete folder and contents")
})

test("an empty folder confirms without the typing", () => {
  impact = {
    status: "ready",
    folderCount: 0,
    parentName: null,
    resourceCount: 0,
  }
  renderDialog()

  expect(screen.queryByLabelText(/to confirm/)).toBeNull()
  expect(deleteButton().disabled).toBe(false)
})

test("deleting passes the contents choice to the mutation", () => {
  renderDialog()
  fireEvent.click(screen.getByLabelText(/Also permanently delete/))
  fireEvent.change(screen.getByLabelText(/to confirm/), {
    target: { value: "Finance" },
  })
  fireEvent.click(deleteButton())

  expect(mutate).toHaveBeenCalledWith({
    organizationId: "org-1",
    folderId: "folders:1",
    deleteResources: true,
  })
})
