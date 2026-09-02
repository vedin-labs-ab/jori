// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type FolderContentsResult } from "../types"
import { type FolderResourceActions } from "./actions"
import { FolderContents } from "./contents"

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../test/router")).Link,
}))

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useMutation: () => () => Promise.resolve({}),
  useQuery: () => undefined,
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
      hasContents: true,
      folderCount: 1,
      resourceCount: 2,
      ownerId: "persons:owner",
      ownerName: "Ada Lovelace",
    },
    {
      folderId: "folder-2",
      name: "Scratch",
      parentId: "folder-0",
      createdAt: 1,
      updatedAt: Date.now(),
      hasContents: false,
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
      visibility: "organization",
      updatedAt: Date.now(),
      ownerId: "persons:owner",
      ownerName: "Ada Lovelace",
    },
    {
      type: "job",
      id: "job-1",
      name: "Digest",
      visibility: "organization",
      updatedAt: Date.now(),
      status: "paused",
    },
  ],
} as FolderContentsResult

/** What the rows can do is covered in menu.test.tsx; this file is about
 *  the table they sit in. */
const inertActions = {
  jobOf: () => undefined,
  files: { pendingFileId: undefined },
  organizationId: "org-1",
  removal: { isDeleting: () => false, isRestoring: () => false },
} as unknown as FolderResourceActions

function renderContents(contents: FolderContentsResult | undefined) {
  render(
    <TooltipProvider>
      <DndContext>
        <FolderContents
          actions={inertActions}
          contents={contents}
          folderId="folder-0"
          newMenu={<button type="button">New</button>}
          onDialog={() => undefined}
        />
      </DndContext>
    </TooltipProvider>
  )
}

test("folders and resources share the Name/Kind/Owner/Items/Updated table", () => {
  renderContents(readyContents)

  for (const header of ["Name", "Kind", "Owner", "Items", "Updated"]) {
    expect(screen.getByRole("columnheader", { name: header })).toBeDefined()
  }

  expect(
    screen.getByRole("link", { name: "Guides" }).getAttribute("href")
  ).toBe("/folders/folder-1")
  expect(screen.getByRole("link", { name: "Leads" }).getAttribute("href")).toBe(
    "/tables/table-1"
  )
  // A paused job is marked with a muted glyph, not a badge: the
  // Kind cell says what the thing is, and a second word there reads as a
  // second kind.
  expect(screen.getByText("Paused").className).toContain("sr-only")
  expect(
    screen.getByRole("button", { name: "Open actions for Leads" })
  ).toBeDefined()
})

test("the Owner column reads across both row groups", () => {
  renderContents(readyContents)

  // A subfolder shows whoever made it, a filed resource its owner, and the
  // job — which no person owns — shows Jori.
  expect(screen.getAllByText("Ada Lovelace")).toHaveLength(2)
  expect(screen.getByText("Grace Hopper")).toBeDefined()
  expect(screen.getByText("Jori")).toBeDefined()
})

test("folder rows count their items; resource rows carry a dash", () => {
  renderContents(readyContents)

  // Guides combines its counts into one number with the breakdown as the
  // tooltip; empty Scratch shows an honest zero.
  expect(screen.getByTitle("1 folder, 2 resources").textContent).toContain("3")
  expect(screen.getByTitle("Empty folder").textContent).toContain("0")
  expect(screen.getAllByText("—")).toHaveLength(2)
})

test("the Items header sorts folders by their count", () => {
  renderContents(readyContents)

  fireEvent.click(screen.getByRole("button", { name: "Items" }))

  const names = screen
    .getAllByRole("link")
    .map((link) => link.textContent?.trim())

  // Ascending puts empty Scratch first; resources all rank alike, so they
  // trail in their given order.
  expect(names).toEqual(["Scratch", "Guides", "Leads", "Digest"])
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
