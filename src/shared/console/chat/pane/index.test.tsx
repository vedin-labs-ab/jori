// @vitest-environment jsdom
import { type ReferenceTarget } from "@contracts/replies/references"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type ReferenceView, targetKey } from "../../references"
import { ChatPane, type ChatPaneProps } from "."

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../../test/router")),
  ...(await import("../../../../../test/routing")),
}))

const mobile = vi.hoisted(() => ({ current: false }))

vi.mock("@/hooks/use-mobile", () => ({ useIsBelow: () => mobile.current }))

const table: ReferenceTarget = { kind: "table", id: "t1" }
const job: ReferenceTarget = { kind: "job", id: "j1" }

const references: Record<string, ReferenceView> = {
  [targetKey(table)]: { ...table, name: "Customer renewals" },
  [targetKey(job)]: { ...job, name: "Renewals watch" },
}

beforeEach(() => {
  mobile.current = false
})

afterEach(cleanup)

function renderPane(overrides: Partial<ChatPaneProps> = {}) {
  const handlers = {
    onActivate: vi.fn(),
    autoOpens: true,
    onAutoOpens: vi.fn(),
    onClose: vi.fn(),
    onCloseAll: vi.fn(),
    onCloseBeside: vi.fn(),
    onOpenChange: vi.fn(),
    onPin: vi.fn(),
  }

  render(
    <TooltipProvider>
      <ChatPane
        active={table}
        body={(target) => <p>Body of {target.id}</p>}
        composer={<p>The composer</p>}
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
    </TooltipProvider>
  )

  return handlers
}

/** The items of the menu a right click on the tab opens. */
function openTabMenu(name: string) {
  fireEvent.contextMenu(screen.getByRole("tab", { name }))

  return within(screen.getByRole("menu"))
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
  expect(screen.getByText("The composer")).toBeDefined()
  expect(screen.getByText("Body of t1")).toBeDefined()
  expect(screen.queryByText("Body of j1")).toBeNull()

  // The header names the target and its kind; the name is the way to
  // its page.
  const header = screen.getByRole("complementary", { name: "Resources" })

  expect(within(header).getByText("Table")).toBeDefined()
  expect(
    within(header)
      .getByRole("link", { name: "Customer renewals" })
      .getAttribute("href")
  ).toBe("/tables/t1")
  expect(within(header).queryByText("Open page")).toBeNull()
})

test("the pin marks a kept tab and toggles, and a double click keeps", () => {
  const { onPin } = renderPane()
  const pinned = screen.getByRole("button", { name: "Unpin Customer renewals" })

  expect(pinned.getAttribute("aria-pressed")).toBe("true")

  fireEvent.click(screen.getByRole("button", { name: "Pin Renewals watch" }))

  expect(onPin).toHaveBeenCalledWith(job)

  fireEvent.doubleClick(screen.getByRole("tab", { name: "Renewals watch" }))

  expect(onPin).toHaveBeenCalledTimes(2)

  // A tab already kept stays kept.
  fireEvent.doubleClick(screen.getByRole("tab", { name: "Customer renewals" }))

  expect(onPin).toHaveBeenCalledTimes(2)
})

test("choosing and closing raise their callbacks", () => {
  const { onActivate, onClose, onOpenChange } = renderPane()

  fireEvent.mouseDown(screen.getByRole("tab", { name: "Renewals watch" }))
  fireEvent.click(screen.getByRole("tab", { name: "Renewals watch" }))

  expect(onActivate).toHaveBeenCalledWith(job)

  fireEvent.click(screen.getByRole("button", { name: "Close Renewals watch" }))

  expect(onClose).toHaveBeenCalledWith(job)
  expect(screen.queryByRole("button", { name: "Pane options" })).toBeNull()

  fireEvent.click(screen.getByRole("button", { name: "Close pane" }))

  expect(onOpenChange).toHaveBeenCalledWith(false)
})

test("a tab's menu offers the editor's closes, disabling what would take nothing", () => {
  const { onClose, onCloseAll, onCloseBeside, onPin } = renderPane()
  const first = openTabMenu("Customer renewals")
  const disabled = (item: HTMLElement) => item.getAttribute("aria-disabled")

  expect(
    first.getAllByRole("menuitem").map((item) => item.textContent)
  ).toEqual([
    "Unpin",
    "Close",
    "Close others",
    "Close to the left",
    "Close to the right",
    "Close all",
  ])
  expect(
    disabled(first.getByRole("menuitem", { name: "Close to the left" }))
  ).toBe("true")
  expect(
    disabled(first.getByRole("menuitem", { name: "Close to the right" }))
  ).toBeNull()

  fireEvent.click(first.getByRole("menuitem", { name: "Close to the right" }))

  expect(onCloseBeside).toHaveBeenCalledWith(table, "right")

  const last = openTabMenu("Renewals watch")

  expect(last.getByRole("menuitem", { name: "Pin" })).toBeDefined()
  expect(
    disabled(last.getByRole("menuitem", { name: "Close to the right" }))
  ).toBe("true")

  fireEvent.click(last.getByRole("menuitem", { name: "Pin" }))

  expect(onPin).toHaveBeenCalledWith(job)

  fireEvent.click(
    openTabMenu("Renewals watch").getByRole("menuitem", { name: "Close" })
  )

  expect(onClose).toHaveBeenCalledWith(job)

  fireEvent.click(
    openTabMenu("Renewals watch").getByRole("menuitem", { name: "Close all" })
  )

  expect(onCloseAll).toHaveBeenCalled()
})

test("alone in the strip, a tab has no others to close", () => {
  renderPane({ tabs: [{ target: table, pinned: false }] })

  const menu = openTabMenu("Customer renewals")

  expect(
    menu
      .getByRole("menuitem", { name: "Close others" })
      .getAttribute("aria-disabled")
  ).toBe("true")
  expect(
    menu
      .getByRole("menuitem", { name: "Close all" })
      .getAttribute("aria-disabled")
  ).toBeNull()
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

test("a target the host cannot open reads as unavailable, with no body or link", () => {
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
  expect(within(pane).queryByRole("link")).toBeNull()
  expect(body).not.toHaveBeenCalled()
})

test("a target without a view for the pane points to its page", () => {
  renderPane({ body: () => null })

  expect(screen.getByText("Open the page to see it in full.")).toBeDefined()
  expect(
    screen.getByRole("link", { name: "Customer renewals" }).getAttribute("href")
  ).toBe("/tables/t1")
})

test("closed, or without tabs, only the chat is there", () => {
  renderPane({ open: false })

  expect(screen.getByText("The chat")).toBeDefined()
  expect(screen.queryByRole("tab")).toBeNull()

  cleanup()
  renderPane({ active: null, tabs: [] })

  expect(screen.queryByRole("complementary")).toBeNull()
})

test("the hint floats over the chat, above the composer, and offers the two ways on", () => {
  const onHint = vi.fn()

  renderPane({ onHint })

  const hint = screen.getByRole("toolbar", {
    name: "Resources beside the chat",
  })
  const pane = screen.getByRole("complementary", { name: "Resources" })

  expect(hint.textContent).toContain("New resources open beside your chat.")
  expect(within(pane).queryByText(/New resources/)).toBeNull()
  expect(
    hint.compareDocumentPosition(screen.getByText("The composer")) &
      Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy()

  fireEvent.click(within(hint).getByRole("button", { name: "Open manually" }))

  expect(onHint).toHaveBeenCalledWith("manual")

  fireEvent.click(within(hint).getByRole("button", { name: "Keep this" }))

  expect(onHint).toHaveBeenCalledWith("keep")
})

test("below lg the pane is a sheet over the chat, and Escape puts it away", () => {
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

test("the tab menu carries the switch for opening new resources on their own", () => {
  const handlers = renderPane()
  const item = openTabMenu("Renewals watch").getByRole("menuitemcheckbox", {
    name: "Open new resources automatically",
  })

  expect(item.getAttribute("aria-checked")).toBe("true")
  fireEvent.click(item)
  expect(handlers.onAutoOpens).toHaveBeenCalledWith(false)
})
