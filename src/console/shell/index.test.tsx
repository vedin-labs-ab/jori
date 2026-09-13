// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { ConsoleShell } from "./index"

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
    select: (state: {
      location: { pathname: string }
      matches: { pathname: string }[]
      loadedAt: number
    }) => unknown
  }) =>
    select({
      location: { pathname: "/runs" },
      matches: [{ pathname: "/runs" }],
      loadedAt: 0,
    }),
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
// The drag provider and the sidebar's signed-in parts need Convex and auth
// providers; the shell's binding under test does not.
vi.mock("../folders/drag/context", () => ({
  ConsoleFolderDrag: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))
vi.mock("../shared/visibility/directory", () => ({
  OrganizationVisibilityDirectory: ({
    children,
  }: {
    children: React.ReactNode
  }) => children,
}))
vi.mock("../folders/section", () => ({ SidebarFolders: () => null }))
vi.mock("../chat/recent", () => ({ useSidebarChats: () => [] }))
vi.mock("./account", () => ({ SidebarUserButton: () => null }))
vi.mock("./organization", () => ({ SidebarOrganizationSwitcher: () => null }))
vi.mock("@/shared/console/shell/navigation", () => ({
  ConsoleSidebar: () => (
    <nav aria-label="Workspace">
      <a href="/runs">Activity</a>
    </nav>
  ),
  PlatformNavigation: () => null,
}))

afterEach(cleanup)

test("opens on a skip link pointing at the main element", () => {
  render(<ConsoleShell>Content</ConsoleShell>)

  const skip = screen.getByRole("link", { name: "Skip to content" })
  const target = skip.getAttribute("href")?.replace("#", "")

  expect(target).toBeTruthy()
  expect(document.querySelector("main")?.id).toBe(target)
  expect(document.querySelector("main")?.getAttribute("tabindex")).toBe("-1")
})

test("keeps the sidebar and header up when the page throws", () => {
  const error = new Error("Run `status` is missing")
  const onCaughtError = vi.fn()
  function Broken(): never {
    throw error
  }

  render(
    <ConsoleShell>
      <Broken />
    </ConsoleShell>,
    { onCaughtError }
  )

  expect(onCaughtError.mock.calls.map(([caught]) => caught)).toEqual([error])

  // The failure is contained: the way to another page is still on screen,
  // so recovering costs a click rather than a full reload.
  expect(screen.getByText("This page didn't load")).toBeDefined()
  expect(screen.getByRole("navigation", { name: "Workspace" })).toBeDefined()
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Activity")
})
