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

describe("create folder form submission", () => {
  test("submitting from the name field validates before any mutation", () => {
    renderCreateDialog()
    submitFrom(screen.getByLabelText("Name"))

    expect(screen.getByRole("alert").textContent).toBe("Name is required.")
    expect(mutate).not.toHaveBeenCalled()
  })

  test("submitting from a filled name field creates the folder", async () => {
    renderCreateDialog()

    const name = screen.getByLabelText("Name")

    fireEvent.change(name, { target: { value: "Reports" } })
    submitFrom(name)

    await waitFor(() => expect(mutate).toHaveBeenCalledOnce())
    expect(mutate.mock.calls[0]?.[0]).toMatchObject({
      organizationId: "org-1",
      name: "Reports",
    })
  })
})
