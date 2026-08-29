// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { FolderDialogs } from "./manage"

const mutate = vi.fn()

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useMutation: () => mutate,
  useQuery: () => undefined,
}))

afterEach(cleanup)

beforeEach(() => {
  mutate.mockReset()
  mutate.mockResolvedValue({})
})

function renderCreateDialog() {
  render(
    <FolderDialogs
      dialog={{ type: "create" }}
      onClose={() => undefined}
      onDeleted={() => undefined}
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

describe("create folder enter submission", () => {
  test("Enter in the name field runs validation before any mutation", () => {
    renderCreateDialog()
    pressEnter(screen.getByLabelText("Name"))

    expect(screen.getByRole("alert").textContent).toBe("Name is required.")
    expect(mutate).not.toHaveBeenCalled()
  })

  test("Enter in a filled name field creates the folder", async () => {
    renderCreateDialog()

    const name = screen.getByLabelText("Name")

    fireEvent.change(name, { target: { value: "Reports" } })
    pressEnter(name)

    await waitFor(() => expect(mutate).toHaveBeenCalledOnce())
    expect(mutate.mock.calls[0]?.[0]).toMatchObject({
      organizationId: "org-1",
      name: "Reports",
    })
  })
})
