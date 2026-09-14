// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { type ReactNode } from "react"
import { afterEach, expect, test, vi } from "vitest"
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { TooltipProvider } from "@/components/ui/tooltip"
import { folderBreadcrumb } from "../folders/breadcrumb"
import { type FolderDetail } from "../folders/types"
import {
  type MaterialBreadcrumb,
  MaterialBreadcrumbContext,
} from "../materials/breadcrumb"
import { ConsoleFrame } from "./frame"

vi.mock("@tanstack/react-router", async () => ({
  useRouterState: ({
    select,
  }: {
    select: (state: {
      location: { pathname: string }
      matches: { pathname: string }[]
      loadedAt: number
    }) => unknown
  }) =>
    select({
      location: { pathname: "/" },
      matches: [{ pathname: "/" }],
      loadedAt: 0,
    }),
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

function renderFrame(
  pathname: string,
  children: ReactNode = "Content",
  options: { contentId?: string; sidebar?: ReactNode } = { sidebar }
) {
  const frame = (path: string) => (
    <TooltipProvider>
      <ConsoleFrame
        contentId={options.contentId}
        pathname={path}
        sidebar={options.sidebar}
      >
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

test.each(["/tables/abc123", "/folders/abc123"])(
  "%s waits for the view to publish before naming the page",
  (pathname) => {
    renderFrame(pathname)

    expect(screen.queryByRole("navigation", { name: "breadcrumb" })).toBeNull()
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull()
  }
)

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

test("clears the previous material controls while another page loads", () => {
  const { publish, setPathname } = renderWithPublisher("/folders/aaa")

  act(() => publish.current?.({ name: "Reports", trail: [] }))
  setPathname("/folders/bbb")
  act(() => publish.current?.(undefined))

  // The previous material must not leave live actions on the new page.
  expect(screen.queryByText("Reports")).toBeNull()

  act(() => publish.current?.({ name: "Archive", trail: [] }))

  expect(screen.getByText("Archive")).toBeDefined()
  expect(screen.queryByText("Reports")).toBeNull()
})

test("hangs the page's menu off its name when the view publishes one", () => {
  const { publish } = renderWithPublisher("/folders")

  act(() =>
    publish.current?.({
      name: "Folders",
      audience: <button type="button">Audience: Via folder</button>,
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
  expect(screen.queryByRole("button", { name: /^Audience:/ })).toBeNull()
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

test("folder usage links back through its ancestors and keeps its suffix inside the breadcrumb", () => {
  const { publish } = renderWithPublisher("/folders/leaf1/usage")
  const folder = {
    folderId: "leaf1",
    name: "Invoices",
    parentId: "root1",
    visibility: { mode: "organization" },
    createdBy: "owner",
    createdAt: 1,
    updatedAt: 1,
    path: [
      { folderId: "root1", name: "Finance" },
      { folderId: "leaf1", name: "Invoices" },
    ],
  } as FolderDetail

  act(() =>
    publish.current?.(
      folderBreadcrumb({
        folder,
        onDialog: vi.fn(),
        view: "usage",
        aside: <span>Folder spend</span>,
        suffix: <button type="button">About these figures</button>,
      })
    )
  )

  const trail = screen.getByRole("navigation", { name: "breadcrumb" })
  const suffix = screen.getByRole("button", { name: "About these figures" })

  expect(trail.contains(suffix)).toBe(true)
  expect(
    screen.getByRole("link", { name: "Folders" }).getAttribute("href")
  ).toBe("/folders")
  expect(
    screen.getByRole("link", { name: "Finance" }).getAttribute("href")
  ).toBe("/folders/root1")
  expect(
    screen.getByRole("link", { name: "Invoices" }).getAttribute("href")
  ).toBe("/folders/leaf1")
  expect(screen.getByText("Usage").getAttribute("aria-current")).toBe("page")
  expect(screen.queryByText("Folder spend")).toBeNull()
  expect(screen.queryByRole("button", { name: /^Audience:/ })).toBeNull()
})

test("carries the skip link's landing id only when handed one", () => {
  renderFrame("/runs", "Content", { contentId: "main-content", sidebar })

  const main = document.querySelector("main")

  expect(main?.id).toBe("main-content")
  // Focusable only by the skip link, so the keyboard lands in the content
  // instead of scrolling to it and staying in the sidebar.
  expect(main?.getAttribute("tabindex")).toBe("-1")

  cleanup()
  renderFrame("/runs", "Content", { sidebar })

  // A frame inside another page must not repeat that page's landing id.
  expect(document.querySelector("main")?.hasAttribute("id")).toBe(false)
})

test("a frame without a sidebar has nothing to toggle", () => {
  renderFrame("/runs", "Content", {})

  expect(screen.queryByRole("button", { name: "Toggle sidebar" })).toBeNull()
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Activity")
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
