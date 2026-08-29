// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { ConsolePage } from "./page"

const { loading, session } = vi.hoisted(() => ({
  loading: {
    activeOrganizationQueries: 0,
    organizationListQueries: 0,
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
    return { data: undefined, isPending: true }
  },
  useConvexSession: () => ({ isAuthenticated: false, isLoading: true }),
  useListOrganizations: () => {
    loading.organizationListQueries += 1
    return { data: undefined, isPending: true }
  },
  useAuthenticatedSession: () => ({
    data: session.isSignedIn ? { user: { id: "user" } } : null,
    isPending: session.isPending,
  }),
}))

vi.mock("@/shared/loading", () => ({
  FullscreenSkeletonLoader: () => <div>Loading console</div>,
}))

vi.mock("convex/react", () => ({ useMutation: () => vi.fn() }))
vi.mock("./context/organization/onboarding/gate", () => ({
  OnboardingGate: () => null,
}))
vi.mock("./integrations/callback", () => ({
  IntegrationCallbackToasts: () => null,
}))
vi.mock("./shell", () => ({
  ConsoleShell: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock("./shell/public", () => ({
  PublicConsoleFrame: ({ children }: { children: React.ReactNode }) => children,
}))

beforeEach(() => {
  loading.activeOrganizationQueries = 0
  loading.organizationListQueries = 0
  session.isPending = false
  session.isSignedIn = true
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
