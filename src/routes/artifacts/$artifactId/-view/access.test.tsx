// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { ArtifactAccess } from "./access"

const { session } = vi.hoisted(() => ({
  session: {
    isAuthLoaded: true,
    isConvexAuthenticated: true,
    isConvexLoading: false,
    isOrganizationLoaded: true,
    isSignedIn: true,
    organization: { id: "tenant" } as { id: string } | null,
  },
}))

vi.mock("@clerk/tanstack-react-start", () => ({
  useAuth: () => ({
    isLoaded: session.isAuthLoaded,
    isSignedIn: session.isSignedIn,
  }),
  useOrganization: () => ({
    isLoaded: session.isOrganizationLoaded,
    organization: session.organization,
  }),
}))

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({
    isAuthenticated: session.isConvexAuthenticated,
    isLoading: session.isConvexLoading,
  }),
}))

vi.mock("@/shared/artifacts/share", () => ({
  ArtifactShareView: ({ artifactId }: { artifactId: string }) => (
    <div>Shared {artifactId}</div>
  ),
}))

vi.mock("@/console/artifacts/view", () => ({
  ArtifactView: ({ artifactId }: { artifactId: string }) => (
    <div>Member {artifactId}</div>
  ),
}))

beforeEach(() => {
  session.isAuthLoaded = true
  session.isConvexAuthenticated = true
  session.isConvexLoading = false
  session.isOrganizationLoaded = true
  session.isSignedIn = true
  session.organization = { id: "tenant" }
})

afterEach(() => cleanup())

test("prefers the member view for an authenticated session", async () => {
  render(<ArtifactAccess artifactId="artifact" secret="secret" />)

  expect(await screen.findByText("Member artifact")).toBeDefined()
  expect(screen.queryByText("Shared artifact")).toBeNull()
})

test("uses the share grant for an anonymous visitor", () => {
  session.isConvexAuthenticated = false
  session.isSignedIn = false
  session.organization = null

  render(<ArtifactAccess artifactId="artifact" secret="secret" />)

  expect(screen.getByText("Shared artifact")).toBeDefined()
})

test("uses the share grant when the signed-in session has no tenant", () => {
  session.organization = null

  render(<ArtifactAccess artifactId="artifact" secret="secret" />)

  expect(screen.getByText("Shared artifact")).toBeDefined()
})
