// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { OrganizationView } from "./organization-view"

vi.mock("@better-auth-ui/react", () => ({
  useActiveOrganization: () => ({ data: undefined, isPending: false }),
  useAuth: () => ({ authClient: {} }),
  useAuthPlugin: () => ({ roles: {}, slugPrefix: "" }),
  useListOrganizationMembers: () => ({
    data: undefined,
    isPending: false,
  }),
  useSession: () => ({ data: undefined }),
}))

afterEach(() => {
  cleanup()
})

test("compact organization identities use menu-scale type and avatar", () => {
  render(
    <OrganizationView
      hideRole
      hideSlug
      organization={{ name: "Vedin Labs" }}
      size="sm"
    />
  )

  const name = screen.getByText("Vedin Labs")
  const fallback = screen.getByText("VE")
  const avatar = fallback.parentElement

  expect(name.className).toContain("text-xs/relaxed")
  expect(avatar?.className).toContain("size-6")
  expect(avatar?.className).toContain("avatar-fallback")
})
