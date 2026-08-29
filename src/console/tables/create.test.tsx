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
}))

afterEach(cleanup)

beforeEach(() => {
  createTable.mockReset()
  createTable.mockResolvedValue({ tableId: "table-1" })
})

function renderDialog() {
  render(
    <CreateTableDialog
      isOpen
      onOpenChange={() => undefined}
      organizationId="org-1"
    />
  )
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

    const alerts = screen
      .getAllByRole("alert")
      .map((alert) => alert.textContent)

    expect(alerts).toEqual([
      "Give the table a name.",
      "Every column needs a key.",
    ])
    expect(createTable).not.toHaveBeenCalled()
  })

  test("Enter in a completed form creates the table", async () => {
    renderDialog()
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Invoices" },
    })
    fireEvent.change(screen.getByLabelText("Column key"), {
      target: { value: "total" },
    })
    pressEnter(screen.getByLabelText("Name"))

    await waitFor(() => expect(createTable).toHaveBeenCalledOnce())
    expect(createTable.mock.calls[0]?.[0]).toMatchObject({
      organizationId: "org-1",
      name: "Invoices",
      columns: [{ key: "total", name: "total", type: "string" }],
    })
  })
})
