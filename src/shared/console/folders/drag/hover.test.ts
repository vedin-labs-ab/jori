import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { createHoverExpander, expandHoverDelay } from "./hover"

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function trackedExpander() {
  const expanded: string[] = []
  const expander = createHoverExpander((folderId) => expanded.push(folderId))

  return { expanded, expander }
}

test("expands after an unbroken dwell", () => {
  const { expanded, expander } = trackedExpander()

  expander.hover("finance")
  vi.advanceTimersByTime(expandHoverDelay - 1)
  expect(expanded).toEqual([])

  vi.advanceTimersByTime(1)
  expect(expanded).toEqual(["finance"])
})

test("keeps the running timer when the same target is re-reported", () => {
  const { expanded, expander } = trackedExpander()

  expander.hover("finance")
  vi.advanceTimersByTime(expandHoverDelay / 2)
  expander.hover("finance")
  vi.advanceTimersByTime(expandHoverDelay / 2)

  expect(expanded).toEqual(["finance"])
})

test("restarts the dwell when the target changes", () => {
  const { expanded, expander } = trackedExpander()

  expander.hover("finance")
  vi.advanceTimersByTime(expandHoverDelay / 2)
  expander.hover("ops")
  vi.advanceTimersByTime(expandHoverDelay / 2)
  expect(expanded).toEqual([])

  vi.advanceTimersByTime(expandHoverDelay / 2)
  expect(expanded).toEqual(["ops"])
})

test("clears the dwell when the drag leaves every target", () => {
  const { expanded, expander } = trackedExpander()

  expander.hover("finance")
  expander.hover(null)
  vi.advanceTimersByTime(expandHoverDelay * 2)

  expect(expanded).toEqual([])
})

test("reset cancels a pending expansion", () => {
  const { expanded, expander } = trackedExpander()

  expander.hover("finance")
  expander.reset()
  vi.advanceTimersByTime(expandHoverDelay * 2)

  expect(expanded).toEqual([])
})

test("dwelling again after an expansion starts a fresh timer", () => {
  const { expanded, expander } = trackedExpander()

  expander.hover("finance")
  vi.advanceTimersByTime(expandHoverDelay)
  expander.hover("finance")
  vi.advanceTimersByTime(expandHoverDelay)

  expect(expanded).toEqual(["finance", "finance"])
})
