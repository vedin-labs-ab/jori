// @vitest-environment jsdom
import { type ReferenceTarget } from "@contracts/replies/references"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { usePaneTabs } from "./tabs"

const table: ReferenceTarget = { kind: "table", id: "t1" }
const job: ReferenceTarget = { kind: "job", id: "j1" }

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A browser whose viewport is narrower than the pane's panel form. */
function stubNarrowViewport() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      addEventListener: () => undefined,
      matches: true,
      removeEventListener: () => undefined,
    }))
  )
}

test("the hint shows after a reply opens the pane, until it is answered", () => {
  const { result } = renderHook(() => usePaneTabs())

  expect(result.current.pane.onHint).toBeUndefined()

  act(() => result.current.autoOpen(table))

  expect(result.current.pane.tabs).toHaveLength(1)
  expect(result.current.pane.onHint).toBeDefined()

  act(() => result.current.pane.onHint?.("keep"))

  expect(result.current.pane.onHint).toBeUndefined()
  expect(window.localStorage.getItem("jori.chat.pane")).toBe("keep")

  act(() => result.current.autoOpen(job))

  expect(result.current.pane.active).toEqual(job)
})

test("choosing to open manually stops replies opening the pane, for the browser", () => {
  const first = renderHook(() => usePaneTabs())

  act(() => first.result.current.autoOpen(table))
  act(() => first.result.current.pane.onHint?.("manual"))

  expect(window.localStorage.getItem("jori.chat.pane")).toBe("manual")

  act(() => first.result.current.autoOpen(job))

  expect(first.result.current.pane.active).toEqual(table)

  first.unmount()

  const next = renderHook(() => usePaneTabs())

  act(() => next.result.current.autoOpen(job))

  expect(next.result.current.pane.tabs).toHaveLength(0)
  expect(next.result.current.pane.onHint).toBeUndefined()

  // The person's own opening is never stopped.
  act(() => next.result.current.openTarget(job))

  expect(next.result.current.pane.open).toBe(true)
})

test("where the pane is a sheet, a reply opens nothing; a tap still does", () => {
  stubNarrowViewport()

  const { result } = renderHook(() => usePaneTabs())

  act(() => result.current.autoOpen(table))

  expect(result.current.pane.tabs).toHaveLength(0)
  expect(result.current.pane.open).toBe(false)
  expect(result.current.pane.onHint).toBeUndefined()

  act(() => result.current.openTarget(table))

  expect(result.current.pane.open).toBe(true)
  expect(result.current.pane.active).toEqual(table)
})
