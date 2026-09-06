// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { MaterialBreadcrumbContext } from "../../materials/breadcrumb"
import { type StoreDetail } from "../../stores/types"
import { type ReferenceTarget } from "../types"
import { ChatPane } from "."
import { ChatPaneBody } from "./body"

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
          onActivate={vi.fn()}
          onClose={vi.fn()}
          onCloseAll={vi.fn()}
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

  // Radix opens on pointer down; the point is away from the origin, where
  // every jsdom box sits, so the panel handle does not take the press.
  const name = screen.getByRole("button", { name: "Settings" })

  fireEvent.pointerDown(name, { clientX: 200, clientY: 200 })
  fireEvent.click(name)

  expect(screen.getByRole("menuitem", { name: "Copy value" })).toBeDefined()
  expect(screen.getByRole("menuitem", { name: "Add schema…" })).toBeDefined()
  expect(shellCrumb.mock.calls.every(([crumb]) => crumb === undefined)).toBe(
    true
  )
})
