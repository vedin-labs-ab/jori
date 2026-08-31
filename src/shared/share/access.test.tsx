// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { MaterialAccess } from "./access"

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

beforeEach(() => {
  session.isConvexAuthenticated = true
  session.isConvexLoading = false
  session.isOrganizationPending = false
  session.isSessionPending = false
  session.isSignedIn = true
  session.organization = { id: "organization" }
})

afterEach(() => cleanup())

function renderAccess(secret: string | null) {
  return render(
    <MaterialAccess
      label="Loading table"
      renderMember={(fallback) => (
        <div>
          Member table
          {fallback === undefined ? null : <div hidden>{fallback}</div>}
        </div>
      )}
      renderShare={() => <div>Shared table</div>}
      secret={secret}
    />
  )
}

test("prefers the member view for an authenticated session", async () => {
  renderAccess("secret")

  expect(await screen.findByText("Member table")).toBeDefined()
})

test("uses the share grant for an anonymous visitor", () => {
  session.isConvexAuthenticated = false
  session.isSignedIn = false
  session.organization = null

  renderAccess("secret")

  expect(screen.getByText("Shared table")).toBeDefined()
  expect(screen.queryByText("Member table")).toBeNull()
})

test("uses the share grant when the signed-in session has no organization", () => {
  session.organization = null

  renderAccess("secret")

  expect(screen.getByText("Shared table")).toBeDefined()
  expect(screen.queryByText("Member table")).toBeNull()
})

test("renders the member view without a share fallback when no secret rides along", async () => {
  session.organization = null

  renderAccess(null)

  expect(await screen.findByText("Member table")).toBeDefined()
  expect(screen.queryByText("Shared table")).toBeNull()
})
