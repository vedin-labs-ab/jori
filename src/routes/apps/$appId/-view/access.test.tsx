// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { AppAccess } from "./access"

const { session } = vi.hoisted(() => ({
  session: {
    isConvexAuthenticated: true,
    isConvexLoading: false,
    isOrganizationPending: false,
    isSessionPending: false,
    isSignedIn: true,
    organization: { id: "organization" } as { id: string } | null,
  },
}))

vi.mock("@/shared/session/auth", () => ({
  useSession: () => ({
    data: session.isSignedIn ? { user: { email: "sam@example.com" } } : null,
    isPending: session.isSessionPending,
  }),
  useActiveOrganization: () => ({
    data: session.organization,
    isPending: session.isOrganizationPending,
  }),
  useConvexSession: () => ({
    isAuthenticated: session.isConvexAuthenticated,
    isLoading: session.isConvexLoading,
  }),
}))

vi.mock("@/shared/apps/share", () => ({
  AppShareView: ({ appId }: { appId: string }) => <div>Shared {appId}</div>,
}))

vi.mock("@/console/apps/view", () => ({
  AppView: ({ appId }: { appId: string }) => <div>Member {appId}</div>,
}))

beforeEach(() => {
  session.isConvexAuthenticated = true
  session.isConvexLoading = false
  session.isOrganizationPending = false
  session.isSessionPending = false
  session.isSignedIn = true
  session.organization = { id: "organization" }
})

afterEach(() => cleanup())

test("prefers the member view for an authenticated session", async () => {
  render(<AppAccess appId="app" secret="secret" />)

  expect(await screen.findByText("Member app")).toBeDefined()
  expect(screen.queryByText("Shared app")).toBeNull()
})

test("uses the share grant for an anonymous visitor", () => {
  session.isConvexAuthenticated = false
  session.isSignedIn = false
  session.organization = null

  render(<AppAccess appId="app" secret="secret" />)

  expect(screen.getByText("Shared app")).toBeDefined()
})

test("uses the share grant when the signed-in session has no organization", () => {
  session.organization = null

  render(<AppAccess appId="app" secret="secret" />)

  expect(screen.getByText("Shared app")).toBeDefined()
})
