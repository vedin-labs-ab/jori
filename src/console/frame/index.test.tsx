// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { WorkspaceFrame } from "."
import { useMaterialMode } from "./mode"

const { viewer } = vi.hoisted(() => ({
  viewer: {
    hasOrganization: true,
    isSignedIn: true,
    secret: null as string | null | undefined,
  },
}))

vi.mock("@/shared/session/auth", () => ({
  useActiveOrganization: () => ({
    data: viewer.hasOrganization ? { id: "organization" } : null,
    isPending: false,
  }),
  useConvexSession: () => ({ isAuthenticated: true, isLoading: false }),
  useSession: () => ({
    data: viewer.isSignedIn ? { user: { id: "user" } } : null,
    isPending: false,
  }),
}))

vi.mock("@/shared/share/link", () => ({
  useShareSecret: () => viewer.secret,
}))

vi.mock("@/shared/loading", () => ({
  FullscreenSkeletonLoader: () => <div>Loading fullscreen</div>,
}))

vi.mock("./chrome", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chrome">{children}</div>
  ),
}))

beforeEach(() => {
  viewer.hasOrganization = true
  viewer.isSignedIn = true
  viewer.secret = null
})

afterEach(cleanup)

test("a member gets the console chrome around the page", async () => {
  function Body() {
    return <div data-testid="body">{useMaterialMode()}</div>
  }

  render(
    <WorkspaceFrame shareable>
      <Body />
    </WorkspaceFrame>
  )

  expect(await screen.findByTestId("chrome")).toBeDefined()
  expect(screen.getByTestId("body").textContent).toBe("console")
})

test("an anonymous visitor gets no chrome at all", () => {
  viewer.isSignedIn = false
  viewer.secret = "abc"

  function Body() {
    return <div data-testid="body">{useMaterialMode()}</div>
  }

  render(
    <WorkspaceFrame shareable>
      <Body />
    </WorkspaceFrame>
  )

  expect(screen.queryByTestId("chrome")).toBeNull()
  expect(screen.getByTestId("body").textContent).toBe("share")
})

test("an unread hash holds the page behind the fullscreen loader", () => {
  viewer.secret = undefined

  function Body() {
    return <div data-testid="body">{useMaterialMode()}</div>
  }

  render(
    <WorkspaceFrame shareable>
      <Body />
    </WorkspaceFrame>
  )

  expect(screen.getByText("Loading fullscreen")).toBeDefined()
  expect(screen.queryByTestId("body")).toBeNull()
})

test("the chrome survives the page inside it changing", async () => {
  const { rerender } = render(
    <WorkspaceFrame shareable>
      <div data-testid="page">list</div>
    </WorkspaceFrame>
  )
  const first = await screen.findByTestId("chrome")

  rerender(
    <WorkspaceFrame shareable>
      <div data-testid="page">detail</div>
    </WorkspaceFrame>
  )

  // Same DOM node, not a rebuilt one: this is what keeps the sidebar and
  // header — and their state — alive across navigation.
  expect(screen.getByTestId("chrome")).toBe(first)
  expect(screen.getByTestId("page").textContent).toBe("detail")
})

test("an anonymous visitor on a protected route still enters the console gate", async () => {
  viewer.isSignedIn = false
  viewer.secret = "abc"
  render(
    <WorkspaceFrame shareable={false}>
      <div>Protected page</div>
    </WorkspaceFrame>
  )
  expect(await screen.findByTestId("chrome")).toBeDefined()
})

test("moving from a protected section to a member's shareable page keeps the frame", async () => {
  const view = render(
    <WorkspaceFrame shareable={false}>
      <div>Jobs</div>
    </WorkspaceFrame>
  )
  const chrome = await screen.findByTestId("chrome")
  view.rerender(
    <WorkspaceFrame shareable>
      <div>Table</div>
    </WorkspaceFrame>
  )
  expect(screen.getByTestId("chrome")).toBe(chrome)
})
