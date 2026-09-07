// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ConsoleNavigationContext } from "./location"
import { ConsoleSidebar } from "./navigation"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../test/router")),
  ...(await import("../../../../test/routing")),
}))

// The command list scrolls its chosen row into view, which jsdom lacks.
beforeEach(() => {
  Object.assign(HTMLElement.prototype, { scrollIntoView: () => undefined })
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

const chats = [
  { id: "conversations_renewals", title: "Renewals at risk", updatedAt: 2 },
  { id: "conversations_flaky", title: "Flaky payroll test", updatedAt: 1 },
]

function renderSidebar(
  pathname: string,
  conversations = chats,
  options: { open?: boolean; navigate?: (href: string) => void } = {}
) {
  return render(
    <TooltipProvider>
      <ConsoleNavigationContext.Provider
        value={{ navigate: options.navigate ?? (() => undefined), pathname }}
      >
        <SidebarProvider open={options.open ?? true}>
          <ConsoleSidebar
            account={null}
            chats={conversations}
            folders={null}
            organization={null}
            pathname={pathname}
          />
        </SidebarProvider>
      </ConsoleNavigationContext.Provider>
    </TooltipProvider>
  )
}

test("New chat leads, then Activity, then the chats, then the resources", () => {
  renderSidebar("/chat/conversations_flaky")

  const links = screen.getAllByRole("link").map((link) => link.textContent)

  expect(links.slice(0, 5)).toEqual([
    "New chat",
    "Activity",
    "Renewals at risk",
    "Flaky payroll test",
    "Jobs",
  ])
  expect(screen.getByText("Chats")).toBeDefined()
  expect(
    screen
      .getByRole("link", { name: "Flaky payroll test" })
      .getAttribute("href")
  ).toBe("/chat/conversations_flaky")
  expect(
    screen
      .getByRole("link", { name: "Flaky payroll test" })
      .getAttribute("data-active")
  ).toBe("true")
  expect(
    screen.getByRole("link", { name: "New chat" }).getAttribute("data-active")
  ).toBe("false")
})

test("New chat is active on /chat itself", () => {
  renderSidebar("/chat")

  expect(
    screen.getByRole("link", { name: "New chat" }).getAttribute("data-active")
  ).toBe("true")
  expect(
    screen.getByRole("link", { name: "Activity" }).getAttribute("data-active")
  ).toBe("false")
})

test("without conversations there is no Chats group at all", () => {
  renderSidebar("/runs", [])

  expect(screen.queryByText("Chats")).toBeNull()
})

test("Chats and Resources close from their labels, and stay closed on the next visit", () => {
  const { unmount } = renderSidebar("/chat")

  fireEvent.click(screen.getByRole("button", { name: "Resources" }))

  expect(screen.queryByRole("link", { name: "Jobs" })).toBeNull()
  expect(screen.getByRole("link", { name: "Renewals at risk" })).toBeDefined()
  expect(
    screen
      .getByRole("button", { name: "Resources" })
      .getAttribute("aria-expanded")
  ).toBe("false")

  fireEvent.click(screen.getByRole("button", { name: "Chats" }))

  expect(screen.queryByRole("link", { name: "Renewals at risk" })).toBeNull()

  unmount()
  renderSidebar("/chat")

  expect(screen.queryByRole("link", { name: "Jobs" })).toBeNull()
  expect(screen.queryByRole("link", { name: "Renewals at risk" })).toBeNull()

  fireEvent.click(screen.getByRole("button", { name: "Resources" }))

  expect(screen.getByRole("link", { name: "Jobs" })).toBeDefined()
})

test("the icon rail folds the chats into one entry that opens a searchable list", () => {
  const navigate = vi.fn()

  renderSidebar("/chat/conversations_flaky", chats, { open: false, navigate })

  const entry = screen.getByRole("button", { name: "Chats" })

  expect(entry.getAttribute("data-active")).toBe("true")

  fireEvent.click(entry)
  fireEvent.change(screen.getByPlaceholderText("Search chats…"), {
    target: { value: "payroll" },
  })

  expect(screen.queryByRole("option", { name: "Renewals at risk" })).toBeNull()

  fireEvent.click(screen.getByRole("option", { name: "Flaky payroll test" }))

  expect(navigate).toHaveBeenCalledWith("/chat/conversations_flaky")
  expect(screen.queryByPlaceholderText("Search chats…")).toBeNull()
})
