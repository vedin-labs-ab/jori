// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { useState } from "react"
import { toast } from "sonner"
import { afterEach, expect, test, vi } from "vitest"
import { EditingProvider } from "../../edit/provider"
import { type EditSurface, useEditing } from "../../edit/state"
import { FolderName } from "./name"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const folder = { folderId: "one", name: "New folder" }
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})
function start(
  save = vi.fn().mockResolvedValue(undefined),
  surface: EditSurface = "contents"
) {
  function Example({ save }: { save: (name: string) => Promise<unknown> }) {
    const [name, setName] = useState(folder.name)
    return (
      <EditingProvider
        name={() => folder.name}
        onCreate={async () => ({
          id: folder.folderId,
          kind: "folder",
          name: folder.name,
        })}
        onRename={async (_, value) => {
          await save(value)
          setName(value)
        }}
      >
        <Row name={name} />
        <button type="button">Elsewhere</button>
      </EditingProvider>
    )
  }
  function Row({ name }: { name: string }) {
    const editing = useEditing()
    return (
      <>
        <button
          type="button"
          onClick={() =>
            editing?.begin(
              { id: folder.folderId, kind: "folder", name },
              surface
            )
          }
        >
          Rename
        </button>
        <FolderName folder={{ ...folder, name }} surface={surface}>
          <a href="#folder">{name}</a>
        </FolderName>
      </>
    )
  }
  render(<Example save={save} />)
  fireEvent.click(screen.getByText("Rename"))
  return save
}
const input = () =>
  screen.getByRole("textbox", { name: "Folder name" }) as HTMLInputElement

test("renaming selects the existing name, saves trimmed text once, and restores focus", async () => {
  const save = start()
  await waitFor(() => expect(document.activeElement).toBe(input()))
  expect(input().selectionStart).toBe(0)
  expect(input().selectionEnd).toBe(folder.name.length)
  fireEvent.change(input(), { target: { value: "  Engineering plans  " } })
  fireEvent.keyDown(input(), { key: "Enter" })
  fireEvent.blur(input())
  await waitFor(() =>
    expect(screen.getByRole("link").textContent).toBe("Engineering plans")
  )
  expect(save).toHaveBeenCalledExactlyOnceWith("Engineering plans")
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByRole("link"))
  )
})

test("Escape keeps the existing folder and discards only the edit", async () => {
  const save = start()
  fireEvent.change(input(), { target: { value: "Draft" } })
  fireEvent.keyDown(input(), { key: "Escape" })
  expect(screen.getByRole("link").textContent).toBe("New folder")
  expect(save).not.toHaveBeenCalled()
})

test("empty names validate inline without saving and Escape still works", () => {
  const save = start()
  fireEvent.change(input(), { target: { value: "  " } })
  fireEvent.keyDown(input(), { key: "Enter" })
  expect(screen.getByRole("alert").textContent).toContain("Enter a name")
  expect(save).not.toHaveBeenCalled()
  fireEvent.keyDown(input(), { key: "Escape" })
  expect(screen.getByRole("link").textContent).toBe("New folder")
})

test("click-away saves without taking focus back from the next control", async () => {
  const save = start()
  await waitFor(() => expect(document.activeElement).toBe(input()))
  fireEvent.change(input(), { target: { value: "Reports" } })
  const elsewhere = screen.getByRole("button", { name: "Elsewhere" })
  elsewhere.focus()
  await waitFor(() => expect(screen.queryByRole("textbox")).toBeNull())
  expect(save).toHaveBeenCalledExactlyOnceWith("Reports")
  expect(document.activeElement).toBe(elsewhere)
})

test("a failed save preserves the draft and offers retry", async () => {
  const save = vi
    .fn()
    .mockRejectedValueOnce(new Error("Connection lost."))
    .mockResolvedValue(undefined)
  start(save)
  fireEvent.change(input(), { target: { value: "Reports" } })
  fireEvent.keyDown(input(), { key: "Enter" })
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledExactlyOnceWith("Connection lost.")
  )
  expect(input().value).toBe("Reports")
  expect(input().getAttribute("aria-invalid")).toBeNull()
  expect(screen.queryByRole("alert")).toBeNull()
  fireEvent.keyDown(input(), { key: "Enter" })
  await waitFor(() =>
    expect(screen.getByRole("link").textContent).toBe("Reports")
  )
  expect(save).toHaveBeenCalledTimes(2)
})

test("IME composition does not commit and F2 starts a fresh rename", async () => {
  const save = start()
  fireEvent.keyDown(input(), { key: "Enter", isComposing: true })
  expect(screen.getByRole("textbox")).toBeDefined()
  expect(save).not.toHaveBeenCalled()
  fireEvent.keyDown(input(), { key: "Escape" })
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByRole("link"))
  )
  fireEvent.keyDown(screen.getByRole("link"), { key: "F2" })
  await waitFor(() => expect(input().value).toBe("New folder"))
})

test("the sidebar focuses the new name and reveals it in the middle of the tree", async () => {
  const scroll = vi.spyOn(Element.prototype, "scrollIntoView")
  start(vi.fn(), "sidebar")
  await waitFor(() => expect(document.activeElement).toBe(input()))
  expect(scroll).toHaveBeenCalledWith({
    block: "center",
    inline: "nearest",
    behavior: "instant",
  })
  expect(input().selectionStart).toBe(0)
  expect(input().selectionEnd).toBe(folder.name.length)
})
