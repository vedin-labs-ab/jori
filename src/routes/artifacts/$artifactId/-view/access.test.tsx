// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { ArtifactAccess } from "./access"

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

vi.mock("@/shared/session/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/session/auth")>()),
  authClient: {
    useSession: () => ({
      data: session.isSignedIn ? { user: { email: "sam@example.com" } } : null,
      isPending: session.isSessionPending,
      isRefetching: false,
    }),
    useActiveOrganization: () => ({
      data: session.organization,
      isPending: session.isOrganizationPending,
      isRefetching: false,
    }),
  },
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
  session.isConvexAuthenticated = true
  session.isConvexLoading = false
  session.isOrganizationPending = false
  session.isSessionPending = false
  session.isSignedIn = true
  session.organization = { id: "organization" }
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

test("uses the share grant when the signed-in session has no organization", () => {
  session.organization = null

  render(<ArtifactAccess artifactId="artifact" secret="secret" />)

  expect(screen.getByText("Shared artifact")).toBeDefined()
})
