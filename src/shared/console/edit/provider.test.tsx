// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useEffect } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { EditingProvider } from "./provider"
import { useEditing } from "./state"

afterEach(cleanup)

const persistence = {
  name: () => "New folder",
  onCreate: vi.fn(),
  onRename: vi.fn(),
}

test("another scope closes the open edit without remounting what the session wraps", async () => {
  const mounted = vi.fn()
  function Console() {
    const editing = useEditing()
    useEffect(mounted, [])

    return (
      <>
        <button
          onClick={() =>
            editing?.begin(
              { id: "f", kind: "folder", name: "Finance" },
              "title"
            )
          }
          type="button"
        >
          Rename
        </button>
        <p>{editing?.edit?.item.name ?? "Nothing open"}</p>
      </>
    )
  }
  const view = render(
    <EditingProvider {...persistence} scope="first">
      <Console />
    </EditingProvider>
  )

  await act(async () => fireEvent.click(screen.getByText("Rename")))
  expect(screen.getByText("Finance")).toBeDefined()

  // The organization changes under a console that stays where it is.
  view.rerender(
    <EditingProvider {...persistence} scope="second">
      <Console />
    </EditingProvider>
  )

  expect(screen.getByText("Nothing open")).toBeDefined()
  expect(mounted).toHaveBeenCalledOnce()
})
