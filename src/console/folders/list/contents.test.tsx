// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type FolderContentsResult } from "../types"
import { FolderContents } from "./contents"

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

afterEach(cleanup)

const readyContents = {
  status: "ready",
  folders: [
    {
      folderId: "folder-1",
      name: "Guides",
      parentId: "folder-0",
      createdAt: 1,
      updatedAt: Date.now(),
      hasContents: true,
    },
    {
      folderId: "folder-2",
      name: "Scratch",
      parentId: "folder-0",
      createdAt: 1,
      updatedAt: Date.now(),
      hasContents: false,
    },
  ],
  resources: [
    {
      type: "table",
      id: "table-1",
      name: "Leads",
      scope: "organization",
      updatedAt: Date.now(),
    },
    {
      type: "automation",
      id: "automation-1",
      name: "Digest",
      scope: "organization",
      updatedAt: Date.now(),
      status: "paused",
    },
  ],
} as FolderContentsResult

function renderContents(contents: FolderContentsResult | undefined) {
  render(
    <DndContext>
      <FolderContents
        contents={contents}
        folderId="folder-0"
        newMenu={<button type="button">New</button>}
        onMove={() => undefined}
        onUnfile={() => undefined}
      />
    </DndContext>
  )
}

test("folders and resources share the Name/Kind/Updated table", () => {
  renderContents(readyContents)

  for (const header of ["Name", "Kind", "Updated"]) {
    expect(screen.getByRole("columnheader", { name: header })).toBeDefined()
  }

  expect(
    screen.getByRole("link", { name: "Guides" }).getAttribute("href")
  ).toBe("/folders/folder-1")
  expect(screen.getByRole("link", { name: "Leads" }).getAttribute("href")).toBe(
    "/tables/table-1"
  )
  expect(screen.getByText("Paused")).toBeDefined()
  expect(
    screen.getByRole("button", { name: "Open actions for Leads" })
  ).toBeDefined()
})

test("a dotted icon marks the subfolders that hold anything", () => {
  renderContents(readyContents)

  const dotted = screen.getByRole("link", { name: "Guides" })
  const plain = screen.getByRole("link", { name: "Scratch" })

  expect(dotted.querySelector(".lucide-folder-dot")).not.toBeNull()
  expect(plain.querySelector(".lucide-folder-dot")).toBeNull()
  expect(plain.querySelector(".lucide-folder")).not.toBeNull()
})

test("loading shows the centered spinner instead of a table", () => {
  renderContents(undefined)

  expect(screen.queryByRole("table")).toBeNull()
  expect(document.querySelector('[data-slot="spinner"]')).not.toBeNull()
})

test("an unauthorized result surfaces its message", () => {
  renderContents({
    status: "unauthorized",
    message: "No seat on this organization.",
    folders: [],
    resources: [],
  } as FolderContentsResult)

  expect(screen.getByText("No seat on this organization.")).toBeDefined()
  expect(screen.queryByRole("table")).toBeNull()
})

test("an empty folder offers the New menu", () => {
  renderContents({
    status: "ready",
    folders: [],
    resources: [],
  } as unknown as FolderContentsResult)

  expect(screen.getByText("Empty folder")).toBeDefined()
  expect(screen.getByRole("button", { name: "New" })).toBeDefined()
  expect(screen.queryByRole("table")).toBeNull()
})
