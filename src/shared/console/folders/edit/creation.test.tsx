// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { EditingProvider } from "../../edit/provider"
import { type EditItem, useEditing } from "../../edit/state"
import { FolderContents } from "../list/contents"
import { type FolderContentsResult } from "../types"

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../../test/router")).Link,
}))
afterEach(cleanup)
const item: EditItem = {
  id: "new",
  kind: "folder",
  name: "New folder",
  parentId: "parent",
}
type FixtureFolder = Extract<
  FolderContentsResult,
  { status: "ready" }
>["folders"][number]
const folder = {
  folderId: "existing",
  name: "Guides",
  parentId: "parent",
  visibility: { mode: "organization" },
  createdBy: "owner",
  ownerId: "owner",
  ownerName: "Ada",
  ownerImage: undefined,
  createdAt: 1,
  updatedAt: 1,
  folderCount: 0,
  resourceCount: 0,
} as FixtureFolder

function example(create: () => Promise<EditItem>, refreshed = false) {
  function Create() {
    const editing = useEditing()
    return (
      <button
        type="button"
        onClick={() => editing?.create("folder", "parent", "contents")}
      >
        New folder
      </button>
    )
  }
  return (
    <TooltipProvider>
      <DndContext>
        <EditingProvider
          name={() => item.name}
          onCreate={create}
          onRename={async () => null}
        >
          <Create />
          <FolderContents
            contents={{
              status: "ready",
              resources: [],
              folders: refreshed
                ? [
                    folder,
                    {
                      ...folder,
                      folderId: item.id as FixtureFolder["folderId"],
                      name: item.name,
                    },
                  ]
                : [folder],
            }}
            folderId="parent"
            onCreate={() => undefined}
            onNewFolder={() => undefined}
            onDialog={() => undefined}
            resourceMenu={() => null}
            selectionActions={{
              isBusy: false,
              onMove: vi.fn(),
              onRemove: vi.fn(),
            }}
          />
        </EditingProvider>
      </DndContext>
    </TooltipProvider>
  )
}

test("creation keeps its row through completion and a later query refresh", async () => {
  let finish!: (item: EditItem) => void
  const create = () =>
    new Promise<EditItem>((resolve) => {
      finish = resolve
    })
  const view = render(example(create))
  fireEvent.click(screen.getByRole("button", { name: "New folder" }))
  const pending = screen.getByText("Creating folder.").closest("tr")
  expect(pending?.children).toHaveLength(8)
  expect(pending?.querySelector("[colspan]")).toBeNull()
  expect(pending?.parentElement?.firstElementChild).toBe(pending)
  expect(screen.queryByRole("textbox")).toBeNull()
  finish(item)
  const input = await screen.findByRole("textbox", { name: "Folder name" })
  expect(input.closest("tr")).toBe(pending)
  fireEvent.change(input, { target: { value: "Draft name" } })
  view.rerender(example(create, true))
  expect(screen.getByRole("textbox")).toBe(input)
  expect((input as HTMLInputElement).value).toBe("Draft name")
  expect(pending?.parentElement?.firstElementChild).toBe(pending)
  expect(screen.queryByRole("link", { name: "New folder" })).toBeNull()
  expect(
    screen
      .getByRole("checkbox", { name: "Select New folder" })
      .hasAttribute("disabled")
  ).toBe(true)
  fireEvent.keyDown(input, { key: "Escape" })
  expect(screen.getByRole("link", { name: "New folder" })).toBeDefined()
})
