// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { SidebarMenu, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { FolderTreeItem } from "./row"
import { type FolderNode } from "./tree"
import { type FolderRow } from "./types"

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../test/router")).Link,
}))

afterEach(cleanup)

function folder(id: string, name: string): FolderNode<FolderRow> {
  return {
    folderId: id as FolderRow["folderId"],
    name,
    parentId: undefined,
    visibility: { mode: "organization" },
    createdBy: "persons:owner" as FolderRow["createdBy"],
    createdAt: 1,
    updatedAt: 1,
    children: [],
  }
}

test("only expanding a branch opens its plain folder icon", () => {
  const parent = folder("parent", "Operations")
  parent.children = [folder("child", "Invoices")]

  function Example() {
    const [expanded, setExpanded] = useState(false)
    return (
      <DndContext>
        <SidebarProvider>
          <SidebarMenu>
            <FolderTreeItem
              expansion={{
                expand: () => setExpanded(true),
                isExpanded: () => expanded,
                toggle: () => setExpanded((value) => !value),
              }}
              node={parent}
              onCreate={vi.fn()}
              onDialog={vi.fn()}
              pathname="/folders/parent"
            />
          </SidebarMenu>
        </SidebarProvider>
      </DndContext>
    )
  }

  render(
    <TooltipProvider>
      <Example />
    </TooltipProvider>
  )
  const parentLink = () => screen.getByRole("link", { name: "Operations" })

  // The selected folder stays closed until its children are revealed.
  expect(parentLink().querySelector(".lucide-folder")).not.toBeNull()
  expect(screen.queryByRole("link", { name: "Invoices" })).toBeNull()

  fireEvent.click(screen.getByRole("button", { name: "Expand Operations" }))
  expect(parentLink().querySelector(".lucide-folder-open")).not.toBeNull()
  // A leaf stays closed even if expansion state includes its id.
  expect(
    screen
      .getByRole("link", { name: "Invoices" })
      .querySelector(".lucide-folder")
  ).not.toBeNull()

  fireEvent.click(screen.getByRole("button", { name: "Collapse Operations" }))
  expect(parentLink().querySelector(".lucide-folder")).not.toBeNull()
  expect(screen.queryByRole("link", { name: "Invoices" })).toBeNull()
})
