// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { useRevealedText } from "./reveal"

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

/** A step of the reveal: two frames. */
const step = () => act(() => vi.advanceTimersByTime(32))

test("shows what is there at first, then reveals growth a few characters a step", () => {
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"],
  })
  const { rerender, result } = renderHook(
    ({ target }) => useRevealedText(target),
    { initialProps: { target: "On it." } }
  )

  expect(result.current).toBe("On it.")

  rerender({ target: "On it. Reading the notes now." })
  expect(result.current).toBe("On it.")

  // The first frame of a step shows nothing yet.
  act(() => vi.advanceTimersByTime(16))
  expect(result.current).toBe("On it.")

  act(() => vi.advanceTimersByTime(16))
  expect(result.current.length).toBeGreaterThan("On it.".length)
  expect(result.current.length).toBeLessThan(
    "On it. Reading the notes now.".length
  )
  expect("On it. Reading the notes now.".startsWith(result.current)).toBe(true)

  for (let count = 0; count < 10; count += 1) {
    step()
  }

  expect(result.current).toBe("On it. Reading the notes now.")
})

test("a burst drains within a second and never trails by more than a sentence", () => {
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"],
  })
  const burst = "word ".repeat(200).trim()
  const { rerender, result } = renderHook(
    ({ target }) => useRevealedText(target),
    { initialProps: { target: "" } }
  )

  rerender({ target: burst })
  step()
  expect(burst.length - result.current.length).toBeLessThanOrEqual(120)

  let steps = 1

  while (result.current !== burst && steps < 30) {
    step()
    steps += 1
  }

  expect(result.current).toBe(burst)
  expect(steps).toBeLessThan(30)
})

test("a target that is not a continuation restarts", () => {
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"],
  })
  const { rerender, result } = renderHook(
    ({ target }) => useRevealedText(target),
    { initialProps: { target: "First reply." } }
  )

  rerender({ target: "Second" })
  expect(result.current).toBe("")

  step()
  expect(result.current.length).toBeGreaterThan(0)
  expect("Second".startsWith(result.current)).toBe(true)
})

test("reduced motion shows the target as it is", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true }))
  )
  const { rerender, result } = renderHook(
    ({ target }) => useRevealedText(target),
    { initialProps: { target: "" } }
  )

  rerender({ target: "The whole reply at once." })

  expect(result.current).toBe("The whole reply at once.")
})
