// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { TableShareView } from "./table"

vi.mock(
  "@tanstack/react-router",
  async () => await import("../../../test/router")
)

const state = vi.hoisted(() => ({ ready: false }))
vi.mock("convex/react", () => ({
  useQuery: () =>
    state.ready ? { name: "Shared table", columns: [] } : undefined,
  usePaginatedQuery: () => ({ status: "LoadingFirstPage", results: [] }),
}))
vi.mock("./link", () => ({ useShareExpired: () => false }))
beforeEach(() => {
  state.ready = false
})
afterEach(cleanup)

test("shared metadata and rows load locally, keeping the share header visible", () => {
  const view = render(<TableShareView secret="secret" tableId="table" />)
  const metadata = screen.getByRole("status", { name: "Loading table" })
  expect(metadata.classList.contains("fixed")).toBe(false)
  state.ready = true
  view.rerender(<TableShareView secret="secret" tableId="table" />)
  expect(screen.getByRole("heading", { name: "Shared table" })).toBeDefined()
  const rows = screen.getByRole("status", { name: "Loading rows" })
  expect(rows.classList.contains("fixed")).toBe(false)
  expect(screen.getByRole("link", { name: "Open in Jori" })).toBeDefined()
})
