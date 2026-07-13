// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { ArtifactLinks } from "./links"

const { revokeShare } = vi.hoisted(() => ({
  revokeShare: vi.fn(() => new Promise<null>(() => undefined)),
}))

vi.mock("convex/react", () => ({
  useMutation: () => revokeShare,
  usePaginatedQuery: () => ({
    loadMore: vi.fn(),
    results: [
      {
        shareId: "active",
        createdAt: Date.UTC(2026, 6, 12, 8),
        expiresAt: Date.UTC(2026, 6, 14, 8),
      },
      {
        shareId: "expired",
        createdAt: Date.UTC(2026, 6, 10, 8),
        expiresAt: Date.UTC(2026, 6, 12, 8),
      },
    ],
    status: "Exhausted",
  }),
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(Date.UTC(2026, 6, 13, 8))
})

afterEach(() => {
  cleanup()
  revokeShare.mockClear()
  vi.useRealTimers()
})

test("opens a compact active and expired link list", () => {
  render(<ArtifactLinks artifactId={"artifact" as never} tenantId="tenant" />)

  fireEvent.click(screen.getByRole("button", { name: "Manage share links" }))

  expect(screen.getByRole("heading", { name: "Links" })).toBeDefined()
  expect(screen.getByText("Active")).toBeDefined()
  expect(screen.getByText("Expired")).toBeDefined()
  expect(screen.getAllByRole("button", { name: "Revoke" })).toHaveLength(1)
})

test("revokes only the selected active link", () => {
  render(<ArtifactLinks artifactId={"artifact" as never} tenantId="tenant" />)

  fireEvent.click(screen.getByRole("button", { name: "Manage share links" }))
  fireEvent.click(screen.getByRole("button", { name: "Revoke" }))

  expect(revokeShare).toHaveBeenCalledWith({
    artifactId: "artifact",
    shareId: "active",
    tenantId: "tenant",
  })
})
