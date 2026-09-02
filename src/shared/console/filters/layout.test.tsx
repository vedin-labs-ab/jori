// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { ConsoleHeaderActionsProvider } from "../layout"
import { ConsoleFilterToggle } from "./field"
import { ConsoleFiltered } from "./layout"
import { ConsoleFiltersProvider } from "./provider"

const mobile = vi.hoisted(() => ({ current: false }))

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => mobile.current }))

const statusOptions = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
] as const

type Status = (typeof statusOptions)[number]["value"]

beforeEach(() => {
  mobile.current = false
  window.localStorage.clear()
})

afterEach(cleanup)

/** Renders a page with one facet under a header slot and the frame's
 *  provider, and hands back the controls the tests reach for. */
function renderPage(storageKey?: string) {
  function FilteredPage() {
    const [slot, setSlot] = useState<HTMLElement | null>(null)
    const [status, setStatus] = useState<Status>("all")

    return (
      <>
        <header ref={setSlot} />
        <ConsoleHeaderActionsProvider slot={slot}>
          <ConsoleFiltersProvider storageKey={storageKey}>
            <ConsoleFiltered
              actions={<input aria-label="Search things" />}
              activeCount={status === "all" ? 0 : 1}
              onReset={() => setStatus("all")}
              panel={
                <ConsoleFilterToggle
                  label="Status"
                  onValueChange={setStatus}
                  options={statusOptions}
                  value={status}
                />
              }
            >
              <p>Things</p>
            </ConsoleFiltered>
          </ConsoleFiltersProvider>
        </ConsoleHeaderActionsProvider>
      </>
    )
  }

  render(<FilteredPage />)

  return {
    aside: () =>
      document.querySelector<HTMLElement>('[data-slot="filters-aside"]'),
    button: () => screen.getByRole("button", { name: /^Filters/ }),
    close: () => screen.getByRole("button", { name: "Close filters" }),
  }
}

test("the Filters button sits ahead of the page's own header actions", () => {
  const { button } = renderPage()
  const header = document.querySelector("header")
  const search = screen.getByRole("textbox", { name: "Search things" })

  expect(header?.contains(button())).toBe(true)
  expect(
    button().compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeGreaterThan(0)
})

test("the panel starts closed, inert, and out of the way", () => {
  const { aside, button } = renderPage()

  expect(button().getAttribute("aria-pressed")).toBe("false")
  expect(aside()?.dataset.state).toBe("closed")
  expect(aside()?.className).toContain("w-0")
  expect(aside()?.querySelector("aside")?.hasAttribute("inert")).toBe(true)
})

test("the button opens the panel and lands focus on its close control", () => {
  const { aside, button, close } = renderPage()

  fireEvent.click(button())

  expect(button().getAttribute("aria-pressed")).toBe("true")
  expect(aside()?.className).toContain("w-72")
  expect(aside()?.querySelector("aside")?.hasAttribute("inert")).toBe(false)
  expect(document.activeElement).toBe(close())
})

test("closing hands focus back to the header button", () => {
  const { button, close } = renderPage()

  fireEvent.click(button())
  fireEvent.click(close())

  expect(button().getAttribute("aria-pressed")).toBe("false")
  expect(document.activeElement).toBe(button())
})

test("the rail toggles the panel by pointer without joining the tab order", () => {
  const { aside } = renderPage()
  const rail = screen.getByRole("button", { name: "Toggle filters" })

  expect(rail.getAttribute("tabindex")).toBe("-1")
  expect(rail.getAttribute("title")).toBe("Toggle filters")

  fireEvent.click(rail)

  expect(aside()?.dataset.state).toBe("open")

  fireEvent.click(rail)

  expect(aside()?.dataset.state).toBe("closed")
})

test("facets off their default count on the button and reset together", () => {
  const { button } = renderPage()

  fireEvent.click(button())

  expect(screen.queryByRole("button", { name: "Reset" })).toBeNull()
  expect(button().dataset.variant).toBe("outline")

  fireEvent.click(screen.getByRole("radio", { name: "Active" }))

  expect(button().getAttribute("aria-label")).toBe("Filters, 1 active")
  expect(within(button()).getByText("1").dataset.slot).toBe("badge")
  expect(button().dataset.variant).toBe("secondary")

  fireEvent.click(screen.getByRole("button", { name: "Reset" }))

  expect(screen.getByRole("radio", { name: "All" }).dataset.state).toBe("on")
  expect(screen.queryByRole("button", { name: "Reset" })).toBeNull()
  expect(button().dataset.variant).toBe("outline")
})

test("the open state is remembered under the frame's storage key", async () => {
  const { button } = renderPage("test.filters")

  fireEvent.click(button())

  expect(window.localStorage.getItem("test.filters")).toBe("true")

  cleanup()

  const reopened = renderPage("test.filters")

  // The first render matches the server; the stored choice lands after.
  await act(() => Promise.resolve())

  expect(reopened.button().getAttribute("aria-pressed")).toBe("true")
})

test("without a storage key nothing is remembered", () => {
  const { button } = renderPage()

  fireEvent.click(button())

  expect(window.localStorage.length).toBe(0)
})

test("below md the panel opens as a sheet over the content", () => {
  mobile.current = true

  const { aside, button } = renderPage()

  expect(aside()).toBeNull()

  fireEvent.click(button())

  const sheet = screen.getByRole("dialog", { name: "Filters" })

  expect(sheet.dataset.side).toBe("right")
  expect(
    within(sheet).getByRole("radiogroup", { name: "Status" })
  ).toBeDefined()
  expect(document.activeElement).toBe(
    within(sheet).getByRole("button", { name: "Close filters" })
  )
})
