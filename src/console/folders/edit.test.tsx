// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import {
  useFolderEditing,
  useFolderRequests,
} from "@/shared/console/folders/edit/state"
import { ConsoleFolderEditing } from "./edit"

const mutate = vi.fn()
vi.mock("convex/react", async (original) => ({
  ...(await original<typeof import("convex/react")>()),
  useMutation: () => mutate,
  useQuery: () => ({ status: "ready", folders: [] }),
}))
vi.mock("@/shared/session/auth", () => ({
  useActiveOrganization: () => ({ data: { id: "org-1" } }),
}))
afterEach(cleanup)
beforeEach(() => {
  mutate.mockReset()
  mutate.mockResolvedValue({
    folderId: "new",
    parentId: "parent",
    name: "New folder",
  })
})
function setup() {
  function Controls() {
    const [dialog, request] = useFolderRequests("contents")
    const editing = useFolderEditing()
    return (
      <>
        <button
          type="button"
          onClick={() => request({ type: "create", parentId: "parent" })}
        >
          New folder
        </button>
        <span role="status">
          {editing?.edit?.creating ? "Creating" : editing?.edit?.folder.name}
        </span>
        {dialog ? <span>Dialog open</span> : null}
      </>
    )
  }
  render(
    <ConsoleFolderEditing>
      <Controls />
    </ConsoleFolderEditing>
  )
}
test("New folder creates in the requested parent without a name form", async () => {
  setup()
  fireEvent.click(screen.getByRole("button"))
  await waitFor(() =>
    expect(mutate).toHaveBeenCalledExactlyOnceWith({
      organizationId: "org-1",
      parentId: "parent",
    })
  )
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toBe("New folder")
  )
  expect(screen.queryByText("Dialog open")).toBeNull()
})
test("repeated activation while creating cannot create duplicate folders", async () => {
  let finish!: (folder: unknown) => void
  mutate.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  setup()
  fireEvent.click(screen.getByRole("button"))
  fireEvent.click(screen.getByRole("button"))
  expect(mutate).toHaveBeenCalledOnce()
  expect(screen.getByRole("status").textContent).toBe("Creating")
  finish({ folderId: "new", name: "New folder" })
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toBe("New folder")
  )
})
