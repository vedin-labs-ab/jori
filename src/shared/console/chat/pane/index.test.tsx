// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { type ChatReference, type ReferenceTarget } from "../types"
import { ChatPane, type ChatPaneProps } from "."
import { targetKey } from "./routes"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../../test/router")),
  ...(await import("../../../../../test/routing")),
}))

const mobile = vi.hoisted(() => ({ current: false }))

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => mobile.current }))

const table: ReferenceTarget = { kind: "table", id: "t1" }
const job: ReferenceTarget = { kind: "job", id: "j1" }

const references: Record<string, ChatReference> = {
  [targetKey(table)]: { ...table, name: "Customer renewals" },
  [targetKey(job)]: { ...job, name: "Renewals watch" },
}

beforeEach(() => {
  mobile.current = false
})

afterEach(cleanup)

/** Opens a menu on its trigger. Radix opens on pointer down; the point is
 *  away from the origin, where every jsdom box sits, so the panel handle
 *  does not take the press for a resize. */
function openMenu(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { clientX: 200, clientY: 200 })
  fireEvent.click(trigger)
}

function renderPane(overrides: Partial<ChatPaneProps> = {}) {
  const handlers = {
    onActivate: vi.fn(),
    onClose: vi.fn(),
    onCloseAll: vi.fn(),
    onOpenChange: vi.fn(),
    onPin: vi.fn(),
  }

  render(
    <ChatPane
      active={table}
      body={(target) => <p>Body of {target.id}</p>}
      open
      resolve={(target) => references[targetKey(target)]}
      tabs={[
        { target: table, pinned: true },
        { target: job, pinned: false },
      ]}
      {...handlers}
      {...overrides}
    >
      <p>The chat</p>
    </ChatPane>
  )

  return handlers
}

test("the tabs name their targets, and the active one shows its body", () => {
  renderPane()

  const tabs = screen.getAllByRole("tab")

  expect(tabs.map((tab) => tab.textContent)).toEqual([
    "Customer renewals",
    "Renewals watch",
  ])
  expect(tabs[0]?.dataset.state).toBe("active")
  expect(screen.getByText("The chat")).toBeDefined()
  expect(screen.getByText("Body of t1")).toBeDefined()
  expect(screen.queryByText("Body of j1")).toBeNull()

  const header = screen.getByRole("complementary", { name: "Resources" })

  expect(within(header).getByText("Table")).toBeDefined()
  expect(
    within(header).getByRole("link", { name: "Open page" }).getAttribute("href")
  ).toBe("/tables/t1")
})

test("a preview tab reads in italics; the pin marks and toggles", () => {
  const { onPin } = renderPane()

  expect(
    screen.getByRole("tab", { name: "Renewals watch" }).className
  ).toContain("italic")
  expect(
    screen.getByRole("tab", { name: "Customer renewals" }).className
  ).not.toContain("italic")

  const pinned = screen.getByRole("button", { name: "Unpin Customer renewals" })

  expect(pinned.getAttribute("aria-pressed")).toBe("true")

  fireEvent.click(screen.getByRole("button", { name: "Pin Renewals watch" }))

  expect(onPin).toHaveBeenCalledWith(job)
})

test("choosing, closing, and closing all raise their callbacks", () => {
  const { onActivate, onClose, onCloseAll, onOpenChange } = renderPane()

  fireEvent.mouseDown(screen.getByRole("tab", { name: "Renewals watch" }))
  fireEvent.click(screen.getByRole("tab", { name: "Renewals watch" }))

  expect(onActivate).toHaveBeenCalledWith(job)

  fireEvent.click(screen.getByRole("button", { name: "Close Renewals watch" }))

  expect(onClose).toHaveBeenCalledWith(job)

  openMenu(screen.getByRole("button", { name: "Pane options" }))
  fireEvent.click(screen.getByRole("menuitem", { name: "Close all" }))

  expect(onCloseAll).toHaveBeenCalled()

  fireEvent.click(screen.getByRole("button", { name: "Close pane" }))

  expect(onOpenChange).toHaveBeenCalledWith(false)
})

test("the strip's tabs are arrow-navigable", async () => {
  renderPane()

  const first = screen.getByRole("tab", { name: "Customer renewals" })

  first.focus()
  fireEvent.keyDown(first, { key: "ArrowRight" })

  // Radix moves the focus a tick later.
  await vi.waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "Renewals watch" })
    )
  )
})

test("a target the host cannot open reads as unavailable, with no body or page", () => {
  const body = vi.fn(() => <p>Never</p>)

  renderPane({
    body,
    resolve: (target) =>
      target.kind === "table"
        ? { ...table, name: "Old renewals", unavailable: true }
        : references[targetKey(target)],
  })

  const pane = screen.getByRole("complementary", { name: "Resources" })

  expect(within(pane).getAllByText("No longer available")).toHaveLength(2)
  expect(screen.getByRole("tab", { name: "Old renewals" })).toBeDefined()
  expect(screen.queryByRole("link", { name: "Open page" })).toBeNull()
  expect(body).not.toHaveBeenCalled()
})

test("a target without a view for the pane points to its page", () => {
  renderPane({ body: () => null })

  expect(screen.getByText("Open the page to see it in full.")).toBeDefined()
  expect(screen.getByRole("link", { name: "Open page" })).toBeDefined()
})

test("closed, or without tabs, only the chat is there", () => {
  renderPane({ open: false })

  expect(screen.getByText("The chat")).toBeDefined()
  expect(screen.queryByRole("tab")).toBeNull()

  cleanup()
  renderPane({ active: null, tabs: [] })

  expect(screen.queryByRole("complementary")).toBeNull()
})

test("the hint offers to keep the behavior or open manually", () => {
  const onHint = vi.fn()

  renderPane({ onHint })

  expect(screen.getByText("New resources open beside your chat.")).toBeDefined()

  fireEvent.click(screen.getByRole("button", { name: "Open manually" }))

  expect(onHint).toHaveBeenCalledWith("manual")
})

test("below md the pane is a sheet over the chat, and Escape puts it away", () => {
  mobile.current = true

  const { onOpenChange } = renderPane()
  const sheet = screen.getByRole("dialog", { name: "Resources" })

  expect(sheet.dataset.side).toBe("right")
  expect(within(sheet).getByText("Body of t1")).toBeDefined()
  expect(screen.getByText("The chat")).toBeDefined()
  expect(document.activeElement).toBe(
    within(sheet).getByRole("button", { name: "Close pane" })
  )

  fireEvent.keyDown(sheet, { key: "Escape" })

  expect(onOpenChange).toHaveBeenCalledWith(false)
})
