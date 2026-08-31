// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { MaterialFrame } from "."
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
    <MaterialFrame>
      <Body />
    </MaterialFrame>
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
    <MaterialFrame>
      <Body />
    </MaterialFrame>
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
    <MaterialFrame>
      <Body />
    </MaterialFrame>
  )

  expect(screen.getByText("Loading fullscreen")).toBeDefined()
  expect(screen.queryByTestId("body")).toBeNull()
})

test("the chrome survives the page inside it changing", async () => {
  const { rerender } = render(
    <MaterialFrame>
      <div data-testid="page">list</div>
    </MaterialFrame>
  )
  const first = await screen.findByTestId("chrome")

  rerender(
    <MaterialFrame>
      <div data-testid="page">detail</div>
    </MaterialFrame>
  )

  // Same DOM node, not a rebuilt one: this is what keeps the sidebar and
  // header — and their state — alive across navigation.
  expect(screen.getByTestId("chrome")).toBe(first)
  expect(screen.getByTestId("page").textContent).toBe("detail")
})
