// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { type ReactNode } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ask, reply, table } from "../../../../../test/chat"
import { type FolderContentsResult } from "../../folders/types"
import { MaterialBreadcrumbContext } from "../../materials/breadcrumb"
import { type ReferenceTarget, type ReferenceView } from "../../references"
import { makeExecution } from "../../runs/fixtures"
import { type StoreDetail } from "../../stores/types"
import { ChatPane, type ChatPaneProps } from "."
import { ChatPaneBody } from "./body"
import { type OpenTarget } from "./tabs"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../../test/router")),
  ...(await import("../../../../../test/routing")),
}))

afterEach(cleanup)

const target: ReferenceTarget = { kind: "store", id: "store-1" }

const store = {
  storeId: "store-1",
  name: "Settings",
  version: 3,
  schema: undefined,
  value: { free: "form" },
  ownerName: "Ada Lovelace",
  archivedAt: undefined,
  updatedAt: Date.now(),
} as unknown as StoreDetail

/** The pane open on one target, its body rendered by the caller. */
function renderPane({
  content,
  reference,
  ...overrides
}: Partial<ChatPaneProps> & {
  content: ReactNode
  reference: ReferenceView
}) {
  const active: ReferenceTarget = { kind: reference.kind, id: reference.id }

  return render(
    <TooltipProvider>
      <ChatPane
        active={active}
        body={() => content}
        autoOpens
        composer={null}
        onActivate={vi.fn()}
        onAutoOpens={vi.fn()}
        onClose={vi.fn()}
        onCloseAll={vi.fn()}
        onCloseBeside={vi.fn()}
        onOpenChange={vi.fn()}
        onPin={vi.fn()}
        open
        resolve={() => reference}
        tabs={[{ target: active, pinned: false }]}
        {...overrides}
      >
        <p>The chat</p>
      </ChatPane>
    </TooltipProvider>
  )
}

test("a store's value shows in the pane, with its menu on the pane's name and nothing in the shell's crumb", async () => {
  const shellCrumb = vi.fn()

  render(
    <TooltipProvider>
      <MaterialBreadcrumbContext.Provider value={shellCrumb}>
        <ChatPane
          active={target}
          body={() => (
            <ChatPaneBody
              material={{
                kind: "store",
                onWriteSchema: () => Promise.resolve(),
                onWriteValue: () => Promise.resolve(),
                store,
              }}
            />
          )}
          autoOpens
          composer={null}
          onActivate={vi.fn()}
          onAutoOpens={vi.fn()}
          onClose={vi.fn()}
          onCloseAll={vi.fn()}
          onCloseBeside={vi.fn()}
          onOpenChange={vi.fn()}
          onPin={vi.fn()}
          open
          resolve={() => ({ ...target, name: "Settings" })}
          tabs={[{ target, pinned: false }]}
        >
          <p>The chat</p>
        </ChatPane>
      </MaterialBreadcrumbContext.Provider>
    </TooltipProvider>
  )

  // The editor arrives on its own; the value reads as the document it is.
  expect(await screen.findByText('"form"')).toBeDefined()

  // The name is the way to the store's page; its menu hangs off the "…"
  // at the header's far right. Radix opens on pointer down; the point is away
  // from the origin, where every jsdom box sits, so the panel handle
  // does not take the press.
  expect(
    screen.getByRole("link", { name: "Settings" }).getAttribute("href")
  ).toBe("/stores/store-1")

  const trigger = screen.getByRole("button", { name: "Settings menu" })

  fireEvent.pointerDown(trigger, { clientX: 200, clientY: 200 })
  fireEvent.click(trigger)

  expect(screen.getByRole("menuitem", { name: "Copy value" })).toBeDefined()
  expect(screen.getByRole("menuitem", { name: "Add schema…" })).toBeDefined()
  expect(shellCrumb.mock.calls.every(([crumb]) => crumb === undefined)).toBe(
    true
  )
})

test("a run shows as its Activity row held open, and the pane's name leads to that row", async () => {
  const execution = makeExecution({
    id: "run-1" as ReturnType<typeof makeExecution>["id"],
    result: "Three reminders sent.",
    task: "Chase the unpaid renewals.",
    title: "Chase renewals",
  })

  renderPane({
    content: (
      <ChatPaneBody
        material={{
          kind: "run",
          execution,
          now: execution.createdAt + 60_000,
          slots: { expanded: (run) => <p>{run.result}</p> },
        }}
      />
    ),
    reference: { kind: "run", id: "run-1", name: "Chase renewals" },
  })

  const pane = screen.getByRole("complementary", { name: "Resources" })

  expect(
    within(pane)
      .getByRole("link", { name: "Chase renewals" })
      .getAttribute("href")
  ).toBe("/runs?run=run-1")
  // The detail is open from the start, and there is no control to fold it.
  expect(await within(pane).findByText("Three reminders sent.")).toBeDefined()
  expect(within(pane).queryByRole("button", { expanded: true })).toBeNull()
  expect(within(pane).queryByRole("button", { expanded: false })).toBeNull()
})

const folderContents = {
  status: "ready",
  folders: [
    {
      folderId: "folder-2",
      name: "Renewals",
      parentId: "folder-1",
      visibility: { mode: "organization" },
      createdBy: "persons:owner",
      createdAt: 1,
      updatedAt: Date.now(),
      hasContents: false,
      folderCount: 0,
      resourceCount: 0,
      ownerId: "persons:owner",
      ownerName: "Ada Lovelace",
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
  ],
} as FolderContentsResult

test("a folder shows its listing, each row leading where it does on the page", async () => {
  render(
    <TooltipProvider>
      <DndContext>
        <ChatPaneBody
          material={{
            kind: "folder",
            contents: {
              contents: folderContents,
              folderId: "folder-1",
              newMenu: null,
              onDialog: vi.fn(),
              resourceMenu: (resource) => (
                <button type="button">{resource.name} menu</button>
              ),
              selectionActions: {
                isBusy: false,
                onMove: vi.fn(),
                onRemove: vi.fn(),
              },
            },
          }}
        />
      </DndContext>
    </TooltipProvider>
  )

  expect(
    (
      await screen.findByRole("link", { name: /^Renewals(?:\s*·|$)/ })
    ).getAttribute("href")
  ).toBe("/folders/folder-2")
  expect(
    screen.getByRole("link", { name: /^Leads(?:\s*·|$)/ }).getAttribute("href")
  ).toBe("/tables/table-1")
  expect(screen.getByRole("button", { name: "Leads menu" })).toBeDefined()
})

test("another chat shows its turns, and a card in it opens beside the chat", () => {
  const onOpenReference = vi.fn<OpenTarget>()

  render(
    <TooltipProvider>
      <ChatPaneBody
        material={{
          kind: "chat",
          thread: {
            draft: null,
            hasMore: false,
            isLoading: false,
            live: null,
            messages: [ask, reply],
            now: reply.createdAt + 60_000,
            onChoose: vi.fn(),
            onLoadMore: vi.fn(),
            onOpenReference,
            resolveReference: (target) =>
              target.id === table.id ? table : undefined,
          },
        }}
      />
    </TooltipProvider>
  )

  expect(screen.getByText("Which renewals are at risk?")).toBeDefined()
  expect(screen.getByText("Harbor House").tagName).toBe("STRONG")

  fireEvent.click(screen.getByRole("button", { name: /Customer renewals/ }))

  expect(onOpenReference).toHaveBeenCalledWith({
    kind: "table",
    id: "collections_renewals",
  })
})
