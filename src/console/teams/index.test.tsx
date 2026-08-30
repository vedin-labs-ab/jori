// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TeamsSettings } from "."

const teams = vi.hoisted(() => ({
  value: undefined as
    | {
        id: string
        name: string
        createdAt: number
        members: { userId: string; name: string; image?: string }[]
      }[]
    | undefined,
}))
const permissions = vi.hoisted(() => ({ granted: false }))

vi.mock("convex/react", () => ({ useQuery: () => teams.value }))
vi.mock("@better-auth-ui/react", () => ({
  useHasPermission: () => ({ data: { success: permissions.granted } }),
  useListOrganizationMembers: () => ({ data: undefined }),
}))
vi.mock("@/shared/session/auth", () => ({ authClient: {} }))

afterEach(() => {
  cleanup()
  teams.value = undefined
  permissions.granted = false
})

test("lists each team with its member count and avatar stack", () => {
  teams.value = [
    {
      id: "team-1",
      name: "Engineering",
      createdAt: 1,
      members: [
        { userId: "user-1", name: "Ada Lovelace" },
        { userId: "user-2", name: "Alan Turing" },
      ],
    },
    { id: "team-2", name: "Design", createdAt: 2, members: [] },
  ]

  render(<TeamsSettings organizationId="organization" />)

  expect(screen.getByText("Engineering")).toBeDefined()
  expect(screen.getByText("2")).toBeDefined()
  expect(screen.getByText("AD")).toBeDefined()
  expect(screen.getByText("AL")).toBeDefined()
  expect(screen.getByText("Design")).toBeDefined()
  expect(screen.getByText("No members")).toBeDefined()
})

test("shows the empty state when the organization has no teams", () => {
  teams.value = []

  render(<TeamsSettings organizationId="organization" />)

  expect(screen.getByText("No teams yet")).toBeDefined()
})

test("hides management affordances from plain members", () => {
  teams.value = [
    { id: "team-1", name: "Engineering", createdAt: 1, members: [] },
  ]

  render(<TeamsSettings organizationId="organization" />)

  expect(screen.queryByRole("button", { name: /Actions:/ })).toBeNull()
  expect(screen.queryByRole("button", { name: /Edit members:/ })).toBeNull()
})

test("offers actions and the roster picker to admins", () => {
  teams.value = [
    { id: "team-1", name: "Engineering", createdAt: 1, members: [] },
  ]
  permissions.granted = true

  render(<TeamsSettings organizationId="organization" />)

  expect(
    screen.getByRole("button", { name: "Actions: Engineering" })
  ).toBeDefined()
  expect(
    screen.getByRole("button", { name: "Edit members: Engineering" })
  ).toBeDefined()
})
