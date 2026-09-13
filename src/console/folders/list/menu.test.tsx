// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { FolderContents } from "@/shared/console/folders/list/contents"
import {
  type FolderContentsResult,
  type FolderDialogRequest,
} from "@/shared/console/folders/types"
import { type FolderResourceActions } from "./actions"
import { ResourceRowMenu } from "./menu"

// What a folder listing's rows offer: each kind's own menu, with the one
// item only a listing can carry — leaving the folder — sitting right after
// the move that would put it in another one.

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../test/router")).Link,
}))

vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useMutation: () => () => Promise.resolve({}),
  useQuery: () => undefined,
}))

afterEach(cleanup)

test("a filed table offers the menu its own list row offers, plus unfiling", () => {
  const actions = stubActions()

  renderRows({ resources: [tableResource] }, { actions })
  openActions("Leads")

  expect(itemLabels()).toEqual([
    "Rename…",
    "Audience…",
    "Move to folder…",
    "Remove from folder",
    "Archive",
  ])

  fireEvent.click(screen.getByRole("menuitem", { name: "Audience…" }))

  expect(actions.onAccess).toHaveBeenCalledOnce()
})

test("a subfolder row opens the folder's own menu", () => {
  const onDialog = vi.fn()

  renderRows({ folders: [folderRow] }, { onDialog })
  openActions("Guides")

  expect(itemLabels()).toEqual([
    "Usage",
    "Rename",
    "Audience…",
    "Move to folder…",
    "Delete",
  ])

  fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }))

  expect(onDialog).toHaveBeenCalledWith({
    type: "rename",
    folder: expect.objectContaining({ folderId: "folder-1" }),
  })
})

test("a filed file offers its own menu; the links resolve on demand", () => {
  renderRows({ resources: [fileResource] })
  openActions("costs.csv")

  // Open and Download wait on the file's URL, which a listing row does not
  // carry; everything the row already knows is there at once.
  expect(itemLabels()).toEqual([
    "Rename…",
    "Audience…",
    "Move to folder…",
    "Remove from folder",
    "Delete",
  ])
})

test("a filed job offers the menu its own page offers", () => {
  const job = {
    id: "job-1",
    name: "Digest",
    status: "paused",
    type: "cron",
  } as ReturnType<FolderResourceActions["jobOf"]>

  renderRows(
    { resources: [jobResource] },
    { actions: stubActions({ jobOf: () => job }) }
  )
  openActions("Digest")

  expect(itemLabels()).toEqual([
    "Edit",
    "Move to folder…",
    "Remove from folder",
    "Resume",
    "Delete",
  ])
})

test("a job still being resolved offers only what the filing knows", () => {
  renderRows({ resources: [jobResource] })
  openActions("Digest")

  expect(itemLabels()).toEqual(["Move to folder…", "Remove from folder"])
})

test("a filed chat opens its conversation and can move without deleting its history", () => {
  const actions = stubActions()
  const resource = {
    type: "chat",
    id: "chat-1",
    name: "Renewals at risk",
    visibility: { mode: "private" },
    updatedAt: Date.now(),
  }

  renderRows({ resources: [resource] }, { actions })

  expect(
    screen.getByRole("link", { name: /Renewals at risk/ }).getAttribute("href")
  ).toBe("/chat/chat-1")
  openActions("Renewals at risk")
  expect(itemLabels()).toEqual([
    "Audience…",
    "Move to folder…",
    "Remove from folder",
  ])
  fireEvent.click(screen.getByRole("menuitem", { name: "Audience…" }))
  expect(actions.onAccess).toHaveBeenCalledWith(resource)
  openActions("Renewals at risk")
  fireEvent.click(screen.getByRole("menuitem", { name: "Remove from folder" }))
  expect(actions.onUnfile).toHaveBeenCalledWith(resource)
})

const folderRow = {
  folderId: "folder-1",
  name: "Guides",
  parentId: "folder-0",
  visibility: { mode: "organization" },
  createdBy: "persons:owner",
  createdAt: 1,
  updatedAt: Date.now(),
  folderCount: 0,
  resourceCount: 0,
  ownerId: "persons:owner",
  ownerName: "Ada Lovelace",
}

const tableResource = {
  type: "table",
  id: "table-1",
  name: "Leads",
  visibility: { mode: "organization" },
  updatedAt: Date.now(),
}

const fileResource = {
  type: "file",
  id: "file-1",
  name: "costs.csv",
  mimeType: "text/csv",
  visibility: { mode: "organization" },
  updatedAt: Date.now(),
}

const jobResource = {
  type: "job",
  id: "job-1",
  name: "Digest",
  visibility: { mode: "organization" },
  status: "paused",
  updatedAt: Date.now(),
}

/** The rows only ever raise requests, so the page's live wiring stands in
 *  as a bag of spies. */
function stubActions(
  overrides: Partial<FolderResourceActions> = {}
): FolderResourceActions {
  return {
    jobOf: () => undefined,
    editor: {} as FolderResourceActions["editor"],
    files: {
      deleteFile: () => undefined,
      pendingFileId: undefined,
      saveFile: () => undefined,
    },
    onAccess: vi.fn(),
    onEdit: vi.fn(),
    onMove: vi.fn(),
    onUnfile: vi.fn(),
    organizationId: "org-1",
    removal: {
      isDeleting: () => false,
      isRestoring: () => false,
      remove: vi.fn(),
      restore: vi.fn(),
    },
    ...overrides,
  }
}

function renderRows(
  listed: { folders?: unknown[]; resources?: unknown[] },
  {
    actions = stubActions(),
    onDialog = () => undefined,
  }: {
    actions?: FolderResourceActions
    onDialog?: (request: FolderDialogRequest) => void
  } = {}
) {
  render(
    <TooltipProvider>
      <DndContext>
        <FolderContents
          contents={
            {
              status: "ready",
              folders: listed.folders ?? [],
              resources: listed.resources ?? [],
            } as unknown as FolderContentsResult
          }
          folderId="folder-0"
          newMenu={<button type="button">New</button>}
          onDialog={onDialog}
          resourceMenu={(resource) => (
            <ResourceRowMenu actions={actions} resource={resource} />
          )}
          selectionActions={{
            isBusy: false,
            onMove: () => undefined,
            onRemove: () => undefined,
          }}
        />
      </DndContext>
    </TooltipProvider>
  )
}

function openActions(name: string) {
  fireEvent.pointerDown(
    screen.getByRole("button", { name: `Open actions for ${name}` }),
    { button: 0, ctrlKey: false }
  )
}

function itemLabels() {
  return screen.getAllByRole("menuitem").map((item) => item.textContent)
}
