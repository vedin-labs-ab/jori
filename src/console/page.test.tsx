// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { useOrganizationId } from "./organization/context"
import { rememberTimezone } from "./organization/pending"
import { ConsolePage } from "./page"

const { loading, mutate, organization, session } = vi.hoisted(() => ({
  mutate: vi.fn(async () => undefined),
  loading: {
    activeOrganizationQueries: 0,
    organizationListQueries: 0,
  },
  organization: {
    isResolved: false,
  },
  session: {
    isPending: false,
    isSignedIn: true,
  },
}))

vi.mock("@/shared/session/auth", () => ({
  activateOrganization: vi.fn(),
  useActiveOrganization: () => {
    loading.activeOrganizationQueries += 1

    return organization.isResolved
      ? { data: { id: "organization" }, isPending: false }
      : { data: undefined, isPending: true }
  },
  useConvexSession: () =>
    organization.isResolved
      ? { isAuthenticated: true, isLoading: false }
      : { isAuthenticated: false, isLoading: true },
  useListOrganizations: () => {
    loading.organizationListQueries += 1

    return organization.isResolved
      ? { data: [{ id: "organization" }], isPending: false }
      : { data: undefined, isPending: true }
  },
  useAuthenticatedSession: () => ({
    data: session.isSignedIn ? { user: { id: "user" } } : null,
    isPending: session.isPending,
  }),
}))

vi.mock("@/shared/loading", () => ({
  FullscreenSkeletonLoader: () => <div>Loading console</div>,
}))

vi.mock("convex/react", () => ({
  useMutation: () => mutate,
}))
vi.mock("./shared/time", () => ({ localTimezone: () => "Europe/Stockholm" }))
vi.mock("./context/organization/onboarding/gate", () => ({
  OnboardingGate: () => null,
}))
vi.mock("./integrations/callback", () => ({
  IntegrationCallbackToasts: () => null,
}))
vi.mock("./shell", () => ({
  ConsoleShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
}))
vi.mock("./shell/public", () => ({
  PublicConsoleFrame: ({ children }: { children: React.ReactNode }) => children,
}))

beforeEach(() => {
  loading.activeOrganizationQueries = 0
  loading.organizationListQueries = 0
  organization.isResolved = false
  session.isPending = false
  session.isSignedIn = true
  window.sessionStorage.clear()
  mutate.mockClear()
})

afterEach(cleanup)

test("starts organization loading while Convex authentication resolves", () => {
  render(<ConsolePage>{() => <div>Console</div>}</ConsolePage>)

  expect(screen.getByText("Loading console")).toBeDefined()
  expect(loading.activeOrganizationQueries).toBe(1)
  expect(loading.organizationListQueries).toBe(1)
})

test("keeps signed-out users behind the loader during redirect", () => {
  session.isSignedIn = false

  render(<ConsolePage>{() => <div>Console</div>}</ConsolePage>)

  // The gate queries mount alongside the session on purpose — overlapping
  // their round-trips is what keeps the signed-in gate parallel — so a
  // signed-out visitor fires them too, sees only the loader, and is
  // redirected by useAuthenticate.
  expect(screen.getByText("Loading console")).toBeDefined()
  expect(loading.activeOrganizationQueries).toBe(1)
  expect(loading.organizationListQueries).toBe(1)
})

test("hands the resolved organization to the page", () => {
  organization.isResolved = true

  render(<ConsolePage>{(id) => <div>{id}</div>}</ConsolePage>)

  expect(screen.getByText("organization")).toBeDefined()
})

test("a page inside a resolved console reuses that chrome", () => {
  organization.isResolved = true

  render(
    <ConsolePage>
      {() => <ConsolePage>{(id) => <div>{id}</div>}</ConsolePage>}
    </ConsolePage>
  )

  // One shell, not two: the inner page recognises the frame around it, so a
  // material page nested in a section frame does not rebuild the console.
  expect(screen.getAllByTestId("shell")).toHaveLength(1)
  expect(screen.getByText("organization")).toBeDefined()
})

test("a nested page re-runs none of the gate queries", () => {
  organization.isResolved = true

  render(
    <ConsolePage>
      {() => <ConsolePage>{() => <div>Console</div>}</ConsolePage>}
    </ConsolePage>
  )

  expect(loading.activeOrganizationQueries).toBe(1)
  expect(loading.organizationListQueries).toBe(1)
})

test("the organization is readable without the render prop", () => {
  organization.isResolved = true

  function Reader() {
    return <div>{useOrganizationId() ?? "none"}</div>
  }

  render(<ConsolePage>{() => <Reader />}</ConsolePage>)

  expect(screen.getByText("organization")).toBeDefined()
})

test("outside a console there is no organization to read", () => {
  function Reader() {
    return <div>{useOrganizationId() ?? "none"}</div>
  }

  render(<Reader />)

  expect(screen.getByText("none")).toBeDefined()
})

test("the zone chosen at creation is declared on the load that follows", async () => {
  organization.isResolved = true
  rememberTimezone("organization", "Asia/Tokyo")

  render(<ConsolePage>{() => <div>Console</div>}</ConsolePage>)

  // Only now does the session token carry the organization the mutation is
  // scoped to, which is why the choice waited for this load.
  await vi.waitFor(() =>
    expect(mutate).toHaveBeenCalledWith({
      organizationId: "organization",
      timezone: "Asia/Tokyo",
    })
  )
})

test("a load with no pending choice declares nothing", () => {
  organization.isResolved = true

  render(<ConsolePage>{() => <div>Console</div>}</ConsolePage>)

  // The person sync still runs; the declaration does not.
  expect(mutate).toHaveBeenCalledTimes(1)
  expect(mutate).toHaveBeenCalledWith({
    organizationId: "organization",
    timezone: "Europe/Stockholm",
  })
})
