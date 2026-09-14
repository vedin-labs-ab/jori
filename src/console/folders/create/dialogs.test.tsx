// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type Editing, EditingContext } from "@/shared/console/edit/state"
import { useCreationRequests } from "@/shared/console/folders/creation"
import { type FolderCreation } from "@/shared/console/folders/types"

afterEach(cleanup)
function setup(kind: FolderCreation, editing?: Editing) {
  function Requests({ kind }: { kind: FolderCreation }) {
    const [request, create] = useCreationRequests("contents")
    return (
      <>
        <button
          type="button"
          onClick={() => create({ creation: kind, folderId: "finance" })}
        >
          New
        </button>
        <span role="status">{request?.creation}</span>
      </>
    )
  }
  render(
    <EditingContext value={editing}>
      <Requests kind={kind} />
    </EditingContext>
  )
}

test.each(["table", "store"] as const)(
  "%s requests create inline instead of opening a dialog",
  (kind) => {
    const editing: Editing = {
      edit: undefined,
      create: vi.fn(),
      begin: vi.fn(),
      claim: vi.fn(),
      close: vi.fn(),
      register: vi.fn(),
      save: vi.fn(),
    }
    setup(kind, editing)
    fireEvent.click(screen.getByText("New"))
    expect(editing.create).toHaveBeenCalledExactlyOnceWith(
      kind,
      "finance",
      "contents"
    )
    expect(screen.getByRole("status").textContent).toBe("")
  }
)
test.each(["file", "job"] as const)(
  "%s keeps its existing setup request",
  (kind) => {
    setup(kind)
    fireEvent.click(screen.getByText("New"))
    expect(screen.getByRole("status").textContent).toBe(kind)
  }
)
