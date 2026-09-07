// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { useTypedPlaceholder } from "./placeholder"

beforeEach(() => {
  vi.useFakeTimers()
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: false }),
  })
})

afterEach(() => {
  vi.useRealTimers()
})

/** One timer fires per act; the next is set once React has rendered. */
function tick(ms: number) {
  act(() => vi.advanceTimersByTime(ms))
}

test("types a phrase, holds it, clears it, and moves to the next", () => {
  const { result } = renderHook(() => useTypedPlaceholder(["Hi", "Yo"], "Ask"))

  expect(result.current).toBe("")

  tick(40)
  expect(result.current).toBe("H")

  tick(40)
  expect(result.current).toBe("Hi")

  // Held, then deleted a character a tick, then a rest, then the next.
  tick(40)
  tick(2_400)
  tick(18)
  expect(result.current).toBe("H")

  tick(18)
  tick(18)
  tick(500)
  expect(result.current).toBe("")

  tick(40)
  expect(result.current).toBe("Y")
})

test("stays on the plain prompt with nothing to type or with motion reduced", () => {
  expect(renderHook(() => useTypedPlaceholder([], "Ask")).result.current).toBe(
    "Ask"
  )

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: true }),
  })

  expect(
    renderHook(() => useTypedPlaceholder(["Hi"], "Ask")).result.current
  ).toBe("Ask")
})
