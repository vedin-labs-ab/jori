// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type FolderContentsResult, type FolderResource } from "../types"
import { FolderContents } from "./contents"
import { type FolderSelectionActions } from "./select"

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../../test/router")).Link,
}))

afterEach(cleanup)

const readyContents = {
  status: "ready",
  folders: [
    {
      folderId: "folder-1",
      name: "Guides",
      parentId: "folder-0",
      visibility: { mode: "organization" },
      createdBy: "persons:owner",
      createdAt: 1,
      updatedAt: Date.now(),
      folderCount: 1,
      resourceCount: 2,
      ownerId: "persons:owner",
      ownerName: "Ada Lovelace",
    },
    {
      folderId: "folder-2",
      name: "Scratch",
      visibility: { mode: "organization" },
      createdBy: "persons:other",
      parentId: "folder-0",
      createdAt: 1,
      updatedAt: Date.now(),
      folderCount: 0,
      resourceCount: 0,
      ownerId: "persons:other",
      ownerName: "Grace Hopper",
    },
  ],
  resources: [
    {
      type: "table",
      id: "table-1",
      name: "Leads",
      visibility: { mode: "organization" },
      updatedAt: Date.now(),
      ownerId: "persons:owner",
      ownerName: "Ada Lovelace",
    },
    {
      type: "job",
      id: "job-1",
      name: "Digest",
      visibility: { mode: "organization" },
      updatedAt: Date.now(),
      status: "paused",
    },
  ],
} as FolderContentsResult

/** What a filed resource can do is its own kind's business, handed in as
 *  its menu; this file is about the table the rows sit in. */
function resourceMenu(resource: FolderResource) {
  return (
    <button aria-label={`Open actions for ${resource.name}`} type="button">
      …
    </button>
  )
}

function renderContents(
  contents: FolderContentsResult | undefined,
  selectionActions: FolderSelectionActions = {
    isBusy: false,
    onMove: vi.fn(),
    onRemove: vi.fn(),
  }
) {
  render(
    <TooltipProvider>
      <DndContext>
        <FolderContents
          contents={contents}
          folderId="folder-0"
          newMenu={<button type="button">New</button>}
          onDialog={() => undefined}
          resourceMenu={resourceMenu}
          selectionActions={selectionActions}
        />
      </DndContext>
    </TooltipProvider>
  )
}

test("lists folders and resources with their owners and item counts", () => {
  renderContents(readyContents)

  for (const header of "Name,Audience,Kind,Owner,Items,Updated".split(",")) {
    expect(screen.getByRole("columnheader", { name: header })).toBeDefined()
  }

  expect(
    screen.getByRole("link", { name: /^Guides(?:\s*·|$)/ }).getAttribute("href")
  ).toBe("/folders/folder-1")
  expect(
    screen.getByRole("link", { name: /^Leads(?:\s*·|$)/ }).getAttribute("href")
  ).toBe("/tables/table-1")
  // Lifecycle state is readable text, separate from the name and audience.
  expect(screen.getByText("Paused").className).not.toContain("sr-only")
  expect(
    screen.getByRole("button", { name: "Open actions for Leads" })
  ).toBeDefined()
  // A subfolder shows whoever made it, a filed resource its owner, and the
  // job — which no person owns — shows Jori.
  expect(screen.getAllByText("Ada Lovelace")).toHaveLength(2)
  expect(screen.getByText("Grace Hopper")).toBeDefined()
  expect(screen.getByText("Jori")).toBeDefined()
  // Guides combines its counts into one number with the breakdown as the
  // tooltip; empty Scratch shows an honest zero.
  expect(screen.getByTitle("1 folder, 2 resources").textContent).toContain("3")
  expect(screen.getByTitle("Empty folder").textContent).toContain("0")
  for (const name of ["Leads", "Digest"]) {
    expect(screen.getByText(name).closest("tr")?.children[5]?.textContent).toBe(
      "—"
    )
  }
  expect(screen.getAllByText("Same as folder")).toHaveLength(4)
})

test("the Items header sorts folders by their count", () => {
  renderContents(readyContents)

  fireEvent.click(screen.getByRole("button", { name: "Items" }))

  const names = screen
    .getAllByRole("link")
    .map((link) => link.querySelector("span.truncate")?.textContent?.trim())

  // Ascending puts empty Scratch first; resources all rank alike, so they
  // trail in their given order.
  expect(names).toEqual(["Scratch", "Guides", "Leads", "Digest"])
})

test("empty and populated subfolders use the same plain icon", () => {
  renderContents(readyContents)

  for (const name of [/^Guides(?:\s*·|$)/, /^Scratch(?:\s*·|$)/]) {
    const folder = screen.getByRole("link", { name })
    expect(folder.querySelector(".lucide-folder")).not.toBeNull()
    expect(folder.querySelector(".lucide-folder-dot")).toBeNull()
  }
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

test("every row drags, and rows select into one bar over both groups", () => {
  const selectionActions = {
    isBusy: false,
    onMove: vi.fn(),
    onRemove: vi.fn(),
  }

  renderContents(readyContents, selectionActions)

  // Folders and resources alike are drag sources, cursor and all.
  for (const name of ["Guides", "Leads", "Digest"]) {
    const row = screen
      .getByRole("link", {
        name: (label) => label === name || label.startsWith(`${name}·`),
      })
      .closest("tr")

    expect(row?.className).toContain("cursor-grab")
    expect(row?.getAttribute("aria-roledescription")).toBe("draggable")
  }

  fireEvent.click(screen.getByRole("checkbox", { name: "Select Guides" }))
  fireEvent.click(screen.getByRole("checkbox", { name: "Select Digest" }))

  expect(screen.getByText("2 selected")).toBeDefined()
  fireEvent.click(screen.getByRole("button", { name: "Move" }))

  // A mixed selection still moves: the folder re-parents, the job
  // re-files out of the folder being viewed.
  expect(selectionActions.onMove).toHaveBeenCalledWith({
    folders: [{ folderId: "folder-1", name: "Guides", parentId: "folder-0" }],
    resources: [
      {
        resourceType: "job",
        resourceId: "job-1",
        name: "Digest",
        folderId: "folder-0",
      },
    ],
  })
})

test("removing a selection names what happens to each part of it", () => {
  const selectionActions = {
    isBusy: false,
    onMove: vi.fn(),
    onRemove: vi.fn(),
  }

  renderContents(readyContents, selectionActions)

  // Tables alone archive, the way their own menus do.
  fireEvent.click(screen.getByRole("checkbox", { name: "Select Leads" }))
  expect(screen.getByRole("button", { name: "Archive" })).toBeDefined()

  // A folder in the selection makes the step a delete.
  fireEvent.click(screen.getByRole("checkbox", { name: "Select Guides" }))
  fireEvent.click(screen.getByRole("button", { name: "Delete" }))

  expect(screen.getByText("Delete 2 items?")).toBeDefined()
  expect(
    screen.getByText(/Folders are deleted with their subfolders/)
  ).toBeDefined()
  expect(
    screen.getByText(/Tables and stores are archived instead/)
  ).toBeDefined()

  fireEvent.click(screen.getByRole("button", { name: "Delete" }))

  expect(selectionActions.onRemove).toHaveBeenCalledWith({
    folders: [expect.objectContaining({ folderId: "folder-1" })],
    resources: [expect.objectContaining({ id: "table-1" })],
  })
})

test("filed chats join bulk moves and removal keeps their history", () => {
  const chat = {
    type: "chat",
    id: "chat-1",
    name: "Renewals at risk",
    visibility: { mode: "private" },
    updatedAt: Date.now(),
  } as FolderResource
  const actions = { isBusy: false, onMove: vi.fn(), onRemove: vi.fn() }

  renderContents({ status: "ready", folders: [], resources: [chat] }, actions)
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Select Renewals at risk" })
  )
  fireEvent.click(screen.getByRole("button", { name: "Move" }))
  expect(actions.onMove).toHaveBeenCalledWith({
    folders: [],
    resources: [
      {
        resourceType: "chat",
        resourceId: "chat-1",
        name: chat.name,
        folderId: "folder-0",
      },
    ],
  })
  expect(screen.queryByRole("button", { name: "Delete" })).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Remove" }))
  expect(
    screen.getByText(
      /Chats are removed from the folder and stay in your chat history/
    )
  ).toBeDefined()
  fireEvent.click(screen.getByRole("button", { name: "Remove" }))
  expect(actions.onRemove).toHaveBeenCalledWith({
    folders: [],
    resources: [chat],
  })
})
