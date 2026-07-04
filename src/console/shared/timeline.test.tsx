// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import { Timeline, type TimelineEntry } from "./timeline"

beforeAll(() => {
  globalThis.ResizeObserver = class {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
})

afterEach(() => {
  cleanup()
})

const hour = 3_600_000
const now = 1_700_000_000_000

function makeEntries(count: number): TimelineEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `entry-${index}`,
    at: now - (index + 1) * hour,
    content: `Entry body ${index}`,
  }))
}

test("renders every entry without paging when the list is short", () => {
  render(<Timeline entries={makeEntries(3)} now={now} />)

  expect(screen.getAllByRole("listitem")).toHaveLength(3)
  expect(screen.getByText("1h ago")).toBeDefined()
  expect(screen.getByText("Entry body 2")).toBeDefined()
  expect(screen.queryByRole("button")).toBeNull()
})

test("pages entries in steps and collapses back", () => {
  render(<Timeline entries={makeEntries(12)} now={now} />)

  expect(screen.getAllByRole("listitem")).toHaveLength(3)

  const control = screen.getByRole("button", { name: "Show 5 more" })
  fireEvent.click(control)

  expect(screen.getAllByRole("listitem")).toHaveLength(8)
  expect(control.textContent).toContain("Show 4 more")

  fireEvent.click(control)

  expect(screen.getAllByRole("listitem")).toHaveLength(12)
  expect(control.textContent).toContain("Show less")

  fireEvent.click(control)

  expect(screen.getAllByRole("listitem")).toHaveLength(3)
})

test("honors custom initial count and step", () => {
  render(
    <Timeline entries={makeEntries(4)} initialCount={2} now={now} step={1} />
  )

  expect(screen.getAllByRole("listitem")).toHaveLength(2)

  fireEvent.click(screen.getByRole("button", { name: "Show 1 more" }))

  expect(screen.getAllByRole("listitem")).toHaveLength(3)
  expect(screen.getByRole("button", { name: "Show 1 more" })).toBeDefined()
})
