// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { ConsolePage } from "./page"

const { loading } = vi.hoisted(() => ({
  loading: {
    activeOrganizationQueries: 0,
    organizationListQueries: 0,
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
  useSession: () => ({
    data: { user: { id: "user" } },
    isPending: false,
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
})

afterEach(cleanup)

test("starts organization loading while Convex authentication resolves", () => {
  render(<ConsolePage>{() => <div>Console</div>}</ConsolePage>)

  expect(screen.getByText("Loading console")).toBeDefined()
  expect(loading.activeOrganizationQueries).toBe(1)
  expect(loading.organizationListQueries).toBe(1)
})
