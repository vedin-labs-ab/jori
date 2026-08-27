// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { MaterialBreadcrumbContext } from "../shared/materials/breadcrumb"
import { ConsoleShell } from "./index"
import { consoleDocumentTitle } from "./routes"

let pathname = "/runs"

vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => unknown
  }) => select({ location: { pathname } }),
  Link: ({ to, ...props }: { to: string } & React.ComponentProps<"a">) => (
    <a href={to} {...props} />
  ),
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
  pathname = "/runs"
})

test("names the page with a heading rather than a one-item breadcrumb", () => {
  render(<ConsoleShell>Content</ConsoleShell>)

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Runs")
  expect(screen.queryByRole("navigation", { name: "breadcrumb" })).toBeNull()
})

test("heads a material detail page with the linked parent surface", () => {
  pathname = "/tables/abc123"
  render(<ConsoleShell>Content</ConsoleShell>)

  const trail = screen.getByRole("navigation", { name: "breadcrumb" })
  const parent = screen.getByRole("link", { name: "Tables" })

  expect(trail.contains(parent)).toBe(true)
  expect(parent.getAttribute("href")).toBe("/tables")
  expect(screen.queryByRole("heading", { level: 1 })).toBeNull()
})

test("appends the material's name once its view publishes it", () => {
  pathname = "/tables/abc123"

  let publish: ((name: string | undefined) => void) | undefined

  render(
    <ConsoleShell>
      <MaterialBreadcrumbContext.Consumer>
        {(value) => {
          publish = value

          return null
        }}
      </MaterialBreadcrumbContext.Consumer>
    </ConsoleShell>
  )
  act(() => publish?.("Launch checklist"))

  const current = screen.getByText("Launch checklist")

  expect(current.getAttribute("aria-current")).toBe("page")
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
