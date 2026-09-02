// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { type ReactNode } from "react"
import { afterEach, expect, test, vi } from "vitest"
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  type MaterialBreadcrumb,
  MaterialBreadcrumbContext,
} from "../materials/breadcrumb"
import { ConsoleFrame } from "./frame"

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../test/router")).Link,
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

afterEach(cleanup)

const sidebar = (
  <nav aria-label="Workspace">
    <a href="/runs">Activity</a>
  </nav>
)

function renderFrame(pathname: string, children: ReactNode = "Content") {
  const frame = (path: string) => (
    <TooltipProvider>
      <ConsoleFrame pathname={path} sidebar={sidebar}>
        {children}
      </ConsoleFrame>
    </TooltipProvider>
  )
  const view = render(frame(pathname))

  return { setPathname: (next: string) => view.rerender(frame(next)) }
}

test("names the page with a heading rather than a one-item breadcrumb", () => {
  renderFrame("/runs")

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Activity")
  expect(screen.queryByRole("navigation", { name: "breadcrumb" })).toBeNull()
})

test("lets the content pane shrink below its content's width", () => {
  renderFrame("/runs")

  // Without this the pane takes its min-content width from the page, so a
  // wide grid or a long line of code widens the pane instead of scrolling
  // inside it — and the header's actions land past the clipped edge.
  expect(document.querySelector("main")?.className).toContain("min-w-0")
})

test("shows nothing on a material detail page before its view publishes", () => {
  renderFrame("/tables/abc123")

  // The trail appears whole once the view publishes; assembling it in
  // pieces read as jitter.
  expect(screen.queryByRole("navigation", { name: "breadcrumb" })).toBeNull()
  expect(screen.queryByRole("heading", { level: 1 })).toBeNull()
})

test("appends the material's name once its view publishes it", () => {
  const { publish } = renderWithPublisher("/tables/abc123")

  act(() => publish.current?.({ name: "Launch checklist" }))

  const current = screen.getByText("Launch checklist")

  expect(current.getAttribute("aria-current")).toBe("page")
})

test("renders a published segment trail with the material as the page", () => {
  const { publish } = renderWithPublisher("/folders/leaf1")

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
  const { publish } = renderWithPublisher("/folders/root1")

  act(() => publish.current?.({ name: "Finance", trail: [] }))

  expect(screen.getByText("Finance").getAttribute("aria-current")).toBe("page")
  expect(screen.queryByRole("link", { name: "Folders" })).toBeNull()
})

test("keeps the previous crumb while the next material page loads", () => {
  const { publish, setPathname } = renderWithPublisher("/folders/aaa")

  act(() => publish.current?.({ name: "Reports", trail: [] }))
  setPathname("/folders/bbb")
  act(() => publish.current?.(undefined))

  // The old trail stands in until the next page publishes — never the
  // half-built default in between.
  expect(screen.getByText("Reports")).toBeDefined()

  act(() => publish.current?.({ name: "Archive", trail: [] }))

  expect(screen.getByText("Archive")).toBeDefined()
  expect(screen.queryByText("Reports")).toBeNull()
})

test("shows nothing on a folder page while its trail loads", () => {
  renderFrame("/folders/abc123")

  expect(screen.queryByRole("heading", { level: 1 })).toBeNull()
  expect(screen.queryByRole("navigation", { name: "breadcrumb" })).toBeNull()
})

test("hangs the page's menu off its name when the view publishes one", () => {
  const { publish } = renderWithPublisher("/folders")

  act(() =>
    publish.current?.({
      name: "Folders",
      menu: (
        <DropdownMenuContent>
          <DropdownMenuItem>Usage</DropdownMenuItem>
        </DropdownMenuContent>
      ),
    })
  )

  // Even a surface with no trail above it: the name becomes the trigger,
  // so the heading it would otherwise be is gone.
  expect(screen.getByRole("button", { name: "Folders" })).toBeDefined()
  expect(screen.queryByRole("heading", { level: 1 })).toBeNull()
})

test("hangs a published aside off the trail, outside its navigation", () => {
  const { publish } = renderWithPublisher("/folders/root1")

  act(() =>
    publish.current?.({
      aside: <a href="/folders/root1/usage">$12.40 · 30 days</a>,
      name: "Finance",
      trail: [],
    })
  )

  const trail = screen.getByRole("navigation", { name: "breadcrumb" })
  const aside = screen.getByRole("link", { name: "$12.40 · 30 days" })

  // A note about the page, not a step in its ancestry: a reader walking
  // the breadcrumb reaches the folder and stops.
  expect(trail.contains(aside)).toBe(false)
  expect(
    trail.compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeGreaterThan(0)
})

test("sets a published suffix right after the name, with no divider", () => {
  const { publish } = renderWithPublisher("/folders/usage")

  act(() =>
    publish.current?.({
      name: "Usage",
      suffix: <button type="button">About these figures</button>,
      trail: [],
    })
  )

  const trail = screen.getByRole("navigation", { name: "breadcrumb" })
  const suffix = screen.getByRole("button", { name: "About these figures" })

  // A mark on the name itself, so it stays inside the crumb, and nothing
  // stands between the two.
  expect(trail.contains(suffix)).toBe(true)
  expect(trail.querySelector('[data-slot="separator"]')).toBeNull()
})

test("opens on a skip link pointing at the main element", () => {
  renderFrame("/runs")

  const skip = screen.getByRole("link", { name: "Skip to content" })
  const target = skip.getAttribute("href")?.replace("#", "")

  expect(target).toBeTruthy()
  expect(document.querySelector("main")?.id).toBe(target)
  // Focusable only by the skip link, so the keyboard lands in the content
  // instead of scrolling to it and staying in the sidebar.
  expect(document.querySelector("main")?.getAttribute("tabindex")).toBe("-1")
})

/** Renders the frame around a page that publishes crumbs on demand. */
function renderWithPublisher(pathname: string) {
  const publish: {
    current: ((material: MaterialBreadcrumb | undefined) => void) | undefined
  } = { current: undefined }
  const { setPathname } = renderFrame(
    pathname,
    <MaterialBreadcrumbContext.Consumer>
      {(value) => {
        publish.current = value

        return null
      }}
    </MaterialBreadcrumbContext.Consumer>
  )

  return { publish, setPathname }
}
