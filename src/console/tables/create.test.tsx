// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { CreateTableDialog } from "./create"

const createTable = vi.fn()

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useMutation: () => createTable,
  useQuery: () => ({
    status: "ready",
    folders: [{ folderId: "finance", name: "Finance" }],
  }),
}))

afterEach(cleanup)

beforeEach(() => {
  createTable.mockReset()
  createTable.mockResolvedValue({ tableId: "table-1" })
})

function renderDialog(initialFolderId?: string) {
  render(
    <CreateTableDialog
      initialFolderId={initialFolderId}
      isOpen
      onOpenChange={() => undefined}
      organizationId="org-1"
    />
  )
}

function fillName() {
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Invoices" },
  })
}

/** Folder and Sharing live behind the collapsed Advanced settings. */
function expandAdvancedSettings() {
  fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }))
}

/** jsdom leaves out the browser's implicit Enter-to-submit, so pressing
 *  Enter in a field is modeled by submitting the form it belongs to. */
function pressEnter(field: HTMLElement) {
  const form = field.closest("form")

  if (form === null) {
    throw new Error("The field is not inside a form.")
  }

  fireEvent.submit(form)
}

describe("create table enter submission", () => {
  test("Enter in the name field runs validation before any mutation", () => {
    renderDialog()
    pressEnter(screen.getByLabelText("Name"))

    expect(screen.getByRole("alert").textContent).toBe("Give the table a name.")
    expect(createTable).not.toHaveBeenCalled()
  })

  test("Enter in a named form creates the table with no columns", async () => {
    renderDialog()
    fillName()
    pressEnter(screen.getByLabelText("Name"))

    await waitFor(() => expect(createTable).toHaveBeenCalledOnce())
    expect(createTable.mock.calls[0]?.[0]).toMatchObject({
      organizationId: "org-1",
      name: "Invoices",
      folderId: undefined,
    })
    expect(createTable.mock.calls[0]?.[0]).not.toHaveProperty("columns")
  })
})

describe("create table folder field", () => {
  test("a selected folder rides along in the create payload", async () => {
    renderDialog()
    fillName()
    expandAdvancedSettings()
    fireEvent.click(screen.getByLabelText("Folder"))
    fireEvent.click(await screen.findByRole("button", { name: "Finance" }))
    fireEvent.click(screen.getByRole("button", { name: "Create table" }))

    await waitFor(() => expect(createTable).toHaveBeenCalledOnce())
    expect(createTable.mock.calls[0]?.[0]).toMatchObject({
      folderId: "finance",
    })
  })

  test("initialFolderId pre-populates the field yet stays editable", async () => {
    renderDialog("finance")
    expandAdvancedSettings()

    expect(screen.getByLabelText("Folder").textContent).toContain("Finance")

    fireEvent.click(screen.getByLabelText("Folder"))
    fireEvent.click(await screen.findByRole("button", { name: "No folder" }))
    fillName()
    fireEvent.click(screen.getByRole("button", { name: "Create table" }))

    await waitFor(() => expect(createTable).toHaveBeenCalledOnce())
    expect(createTable.mock.calls[0]?.[0]).toMatchObject({
      folderId: undefined,
    })
  })
})
