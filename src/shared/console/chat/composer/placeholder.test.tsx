// @vitest-environment jsdom
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { TypedPlaceholder } from "./placeholder"

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
  const { container } = render(
    <TypedPlaceholder fallback="Ask" phrases={["Hi", "Yo"]} />
  )
  const result = {
    get current() {
      return container.textContent
    },
  }

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
  expect(
    render(<TypedPlaceholder fallback="Ask" phrases={[]} />).container
      .textContent
  ).toBe("Ask")

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: true }),
  })

  expect(
    render(<TypedPlaceholder fallback="Ask" phrases={["Hi"]} />).container
      .textContent
  ).toBe("Ask")
})
