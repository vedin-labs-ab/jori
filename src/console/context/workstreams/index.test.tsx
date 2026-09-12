// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { type ReactNode } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { ContextWorkstreams } from "."

const useQuery = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("Paused workstreams must not subscribe to queries")
  })
)
vi.mock("convex/react", () => ({ useQuery }))
vi.mock("@/console/page", () => ({
  ConsolePage: ({
    children,
  }: {
    children: (organizationId: string) => ReactNode
  }) => children("organization"),
}))
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

afterEach(cleanup)

test("the paused workstreams route stays navigable without subscribing to workstream data", () => {
  render(<ContextWorkstreams />)

  expect(screen.getByText("Coming soon")).toBeDefined()
  expect(
    screen.getByRole("tab", { name: "Workstreams" }).getAttribute("data-state")
  ).toBe("active")
  expect(
    screen.getByRole("tab", { name: "Organization" }).getAttribute("href")
  ).toBe("/context")
  expect(useQuery).not.toHaveBeenCalled()
})
