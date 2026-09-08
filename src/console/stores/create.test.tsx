// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { submitFrom } from "../../../test/editor"
import { CreateStoreDialog } from "./create"

const createStore = vi.fn()

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useMutation: () => createStore,
  useQuery: () => ({
    status: "ready",
    folders: [{ folderId: "finance", name: "Finance" }],
  }),
}))

afterEach(cleanup)

beforeEach(() => {
  createStore.mockReset()
  createStore.mockResolvedValue({})
})

function renderDialog(initialFolderId?: string) {
  render(
    <CreateStoreDialog
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

/** Folder and Visibility live behind the collapsed Advanced settings. */
function expandAdvancedSettings() {
  fireEvent.click(screen.getByRole("button", { name: "Advanced settings" }))
}

describe("create store form submission", () => {
  test("submitting from the name field validates before any mutation", () => {
    renderDialog()
    submitFrom(screen.getByLabelText("Name"))

    expect(screen.getByRole("alert").textContent).toBe("Give the store a name.")
    expect(createStore).not.toHaveBeenCalled()
  })

  test("submitting a named form creates the store without a schema", async () => {
    renderDialog()
    fillName()
    submitFrom(screen.getByLabelText("Name"))

    await waitFor(() => expect(createStore).toHaveBeenCalledOnce())
    expect(createStore.mock.calls[0]?.[0]).toMatchObject({
      organizationId: "org-1",
      name: "Invoices",
      folderId: undefined,
    })
    expect(createStore.mock.calls[0]?.[0]).not.toHaveProperty("schema")
  })
})

describe("create store folder field", () => {
  test("a selected folder rides along in the create payload", async () => {
    renderDialog()
    fillName()
    expandAdvancedSettings()
    fireEvent.click(screen.getByLabelText("Folder"))
    fireEvent.click(await screen.findByRole("button", { name: "Finance" }))
    fireEvent.click(screen.getByRole("button", { name: "Create store" }))

    await waitFor(() => expect(createStore).toHaveBeenCalledOnce())
    expect(createStore.mock.calls[0]?.[0]).toMatchObject({
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
    fireEvent.click(screen.getByRole("button", { name: "Create store" }))

    await waitFor(() => expect(createStore).toHaveBeenCalledOnce())
    expect(createStore.mock.calls[0]?.[0]).toMatchObject({
      folderId: undefined,
    })
  })
})
