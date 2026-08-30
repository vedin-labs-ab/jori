// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { CreationDialogs, type CreationRequest } from "./dialogs"

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useMutation: () => vi.fn(),
  useQuery: () => ({
    status: "ready",
    folders: [{ folderId: "folder-1", name: "Finance", parentId: undefined }],
  }),
}))

afterEach(cleanup)

function renderDialogs(request: CreationRequest | undefined) {
  render(
    <CreationDialogs
      onClose={() => undefined}
      organizationId="org-1"
      request={request}
    />
  )
}

test("no request leaves every creation dialog closed", () => {
  renderDialogs(undefined)

  expect(screen.queryByRole("dialog")).toBeNull()
})

test("a table request opens the table dialog on the requested folder", () => {
  renderDialogs({ creation: "table", folderId: "folder-1" })

  expect(screen.getByRole("heading", { name: "Create table" })).toBeDefined()
  fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }))
  expect(screen.getByLabelText("Folder").textContent).toContain("Finance")
})

test("a store request opens only the store dialog", () => {
  renderDialogs({ creation: "store", folderId: "folder-1" })

  expect(screen.getByRole("heading", { name: "Create store" })).toBeDefined()
  expect(screen.queryByRole("heading", { name: "Create table" })).toBeNull()
})

test("a request without a folder starts the dialog unfiled", () => {
  renderDialogs({ creation: "table" })

  fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }))
  expect(screen.getByLabelText("Folder").textContent).toContain("No folder")
})
