// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type FolderTreeResult } from "../types"
import { RootFolderList } from "./overview"

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    params,
    to,
    ...props
  }: {
    params?: Record<string, string>
    to: string
  } & React.ComponentProps<"a">) => (
    <a
      href={Object.values(params ?? {}).reduce(
        (path, value) => path.replace(/\$\w+/, value),
        to
      )}
      {...props}
    />
  ),
}))

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useMutation: () => () => Promise.resolve({}),
  useQuery: () => undefined,
}))

afterEach(cleanup)

function folderRow(overrides: Record<string, unknown>) {
  return {
    folderId: "folder-1",
    name: "Guides",
    parentId: undefined,
    createdAt: 1,
    updatedAt: Date.now(),
    hasContents: false,
    ...overrides,
  }
}

function renderList(tree: FolderTreeResult | undefined) {
  render(
    <DndContext>
      <RootFolderList onCreate={() => undefined} tree={tree} />
    </DndContext>
  )
}

test("root folders land in the same table as a folder's contents", () => {
  renderList({
    status: "ready",
    folders: [
      folderRow({ hasContents: true }),
      folderRow({ folderId: "folder-2", name: "Nested", parentId: "folder-1" }),
    ],
  } as FolderTreeResult)

  for (const header of ["Name", "Kind", "Updated"]) {
    expect(screen.getByRole("columnheader", { name: header })).toBeDefined()
  }

  const root = screen.getByRole("link", { name: "Guides" })
  expect(root.getAttribute("href")).toBe("/folders/folder-1")
  expect(root.querySelector(".lucide-folder-dot")).not.toBeNull()
  // Nested folders stay off the overview — it lists roots only.
  expect(screen.queryByRole("link", { name: "Nested" })).toBeNull()
})

test("loading shows the padded skeleton instead of a table", () => {
  renderList(undefined)

  expect(screen.queryByRole("table")).toBeNull()
  expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull()
})

test("an unauthorized tree surfaces its message", () => {
  renderList({
    status: "unauthorized",
    message: "No seat on this organization.",
    folders: [],
  } as FolderTreeResult)

  expect(screen.getByText("No seat on this organization.")).toBeDefined()
  expect(screen.queryByRole("table")).toBeNull()
})

test("no folders yet introduces the surface with a create action", () => {
  renderList({ status: "ready", folders: [] } as unknown as FolderTreeResult)

  expect(screen.getByText("No folders yet")).toBeDefined()
  expect(screen.getByRole("button", { name: /New folder/ })).toBeDefined()
})
