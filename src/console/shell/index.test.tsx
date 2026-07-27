// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { ConsoleShell } from "./index"
import { consoleDocumentTitle } from "./routes"

vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => unknown
  }) => select({ location: { pathname: "/runs" } }),
}))

vi.mock("@/components/ui/sidebar", () => ({
  SidebarInset: (props: React.ComponentProps<"main">) => <main {...props} />,
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarTrigger: (props: React.ComponentProps<"button">) => (
    <button type="button" {...props}>
      Toggle sidebar
    </button>
  ),
}))

vi.mock("@/components/ui/separator", () => ({ Separator: () => null }))
vi.mock("./navigation", () => ({
  ConsoleSidebar: () => (
    <nav aria-label="Workspace">
      <a href="/runs">Runs</a>
    </nav>
  ),
}))

afterEach(() => {
  cleanup()
})

test("names the page with a heading rather than a one-item breadcrumb", () => {
  render(<ConsoleShell>Content</ConsoleShell>)

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Runs")
  expect(screen.queryByRole("navigation", { name: "breadcrumb" })).toBeNull()
})

test("opens on a skip link pointing at the main element", () => {
  render(<ConsoleShell>Content</ConsoleShell>)

  const skip = screen.getByRole("link", { name: "Skip to content" })
  const target = skip.getAttribute("href")?.replace("#", "")

  expect(target).toBeTruthy()
  expect(document.querySelector("main")?.id).toBe(target)
  // Focusable only by the skip link, so the keyboard lands in the content
  // instead of scrolling to it and staying in the sidebar.
  expect(document.querySelector("main")?.getAttribute("tabindex")).toBe("-1")
})

test("titles the browser tab with the page, then the product", () => {
  expect(consoleDocumentTitle("/runs")).toBe("Runs · Jori")
  expect(consoleDocumentTitle("/context/places")).toBe("Context · Jori")
})
