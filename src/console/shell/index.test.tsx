// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  type MaterialBreadcrumb,
  MaterialBreadcrumbContext,
} from "../shared/materials/breadcrumb"
import { ConsoleShell } from "./index"
import { consoleDocumentTitle } from "./routes"

let pathname = "/runs"

vi.mock("@tanstack/react-router", async () => ({
  // The real boundary, not a stub: containment is the one shell behaviour
  // here that a passthrough would quietly report as working.
  CatchBoundary: (
    await vi.importActual<typeof import("@tanstack/react-router")>(
      "@tanstack/react-router"
    )
  ).CatchBoundary,
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => unknown
  }) => select({ location: { pathname } }),
  Link: (await import("../../../test/router")).Link,
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
// The drag provider needs Convex and auth providers; the shell's layout
// concerns under test do not.
vi.mock("../folders/drag/context", () => ({
  FolderDragProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))
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

test("shows nothing on a material detail page before its view publishes", () => {
  pathname = "/tables/abc123"
  render(<ConsoleShell>Content</ConsoleShell>)

  // The trail appears whole once the view publishes; assembling it in
  // pieces read as jitter.
  expect(screen.queryByRole("navigation", { name: "breadcrumb" })).toBeNull()
  expect(screen.queryByRole("heading", { level: 1 })).toBeNull()
})

test("appends the material's name once its view publishes it", () => {
  const publish = renderWithPublisher("/tables/abc123")

  act(() => publish.current?.({ name: "Launch checklist" }))

  const current = screen.getByText("Launch checklist")

  expect(current.getAttribute("aria-current")).toBe("page")
})

test("renders a published segment trail with the material as the page", () => {
  const publish = renderWithPublisher("/folders/leaf1")

  act(() =>
    publish.current?.({
      name: "Invoices",
      trail: [
        {
          name: "Finance",
          to: "/folders/$folderId",
          params: { folderId: "root1" },
        },
        {
          name: "Vendors",
          to: "/folders/$folderId",
          params: { folderId: "mid1" },
        },
      ],
    })
  )

  const first = screen.getByRole("link", { name: "Finance" })
  const second = screen.getByRole("link", { name: "Vendors" })

  expect(first.getAttribute("href")).toBe("/folders/root1")
  expect(second.getAttribute("href")).toBe("/folders/mid1")
  expect(screen.getByText("Invoices").getAttribute("aria-current")).toBe("page")
})

test("a published empty trail names a root material without ancestors", () => {
  const publish = renderWithPublisher("/folders/root1")

  act(() => publish.current?.({ name: "Finance", trail: [] }))

  expect(screen.getByText("Finance").getAttribute("aria-current")).toBe("page")
  expect(screen.queryByRole("link", { name: "Folders" })).toBeNull()
})

test("keeps the previous crumb while the next material page loads", () => {
  const publish = renderWithPublisher("/folders/aaa")

  act(() => publish.current?.({ name: "Reports", trail: [] }))
  pathname = "/folders/bbb"
  act(() => publish.current?.(undefined))

  // The old trail stands in until the next page publishes — never the
  // half-built default in between.
  expect(screen.getByText("Reports")).toBeDefined()

  act(() => publish.current?.({ name: "Archive", trail: [] }))

  expect(screen.getByText("Archive")).toBeDefined()
  expect(screen.queryByText("Reports")).toBeNull()
})

test("shows nothing on a folder page while its trail loads", () => {
  pathname = "/folders/abc123"
  render(<ConsoleShell>Content</ConsoleShell>)

  expect(screen.queryByRole("heading", { level: 1 })).toBeNull()
  expect(screen.queryByRole("navigation", { name: "breadcrumb" })).toBeNull()
})

function renderWithPublisher(path: string) {
  pathname = path

  const publish: {
    current: ((material: MaterialBreadcrumb | undefined) => void) | undefined
  } = { current: undefined }

  render(
    <TooltipProvider>
      <ConsoleShell>
        <MaterialBreadcrumbContext.Consumer>
          {(value) => {
            publish.current = value

            return null
          }}
        </MaterialBreadcrumbContext.Consumer>
      </ConsoleShell>
    </TooltipProvider>
  )

  return publish
}

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

test("keeps the sidebar and header up when the page throws", () => {
  function Broken(): never {
    throw new Error("Run `status` is missing")
  }

  render(
    <ConsoleShell>
      <Broken />
    </ConsoleShell>
  )

  // The failure is contained: the way to another page is still on screen,
  // so recovering costs a click rather than a full reload.
  expect(screen.getByText("This page didn't load")).toBeDefined()
  expect(screen.getByRole("navigation", { name: "Workspace" })).toBeDefined()
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Runs")
})

test("titles the browser tab with the page, then the product", () => {
  expect(consoleDocumentTitle("/runs")).toBe("Runs · Jori")
  expect(consoleDocumentTitle("/context/places")).toBe("Context · Jori")
})
