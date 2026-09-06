// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ConsoleSidebar } from "./navigation"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../test/router")),
  ...(await import("../../../../test/routing")),
}))

afterEach(cleanup)

const chats = [
  { id: "conversations_renewals", title: "Renewals at risk", updatedAt: 2 },
  { id: "conversations_flaky", title: "Flaky payroll test", updatedAt: 1 },
]

function renderSidebar(pathname: string, conversations = chats) {
  return render(
    <TooltipProvider>
      <SidebarProvider>
        <ConsoleSidebar
          account={null}
          chats={conversations}
          folders={null}
          organization={null}
          pathname={pathname}
        />
      </SidebarProvider>
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
