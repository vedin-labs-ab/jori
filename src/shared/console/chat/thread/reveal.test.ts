// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { advance, useRevealedText } from "./reveal"

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const frame = () => act(() => vi.advanceTimersByTime(16))

test("shows what is there at first, then reveals growth a few characters a frame", () => {
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

  frame()
  expect(result.current).toBe("On it. R")
  frame()
  expect(result.current).toBe("On it. Rea")

  for (let count = 0; count < 20; count += 1) {
    frame()
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
  frame()
  expect(burst.length - result.current.length).toBeLessThanOrEqual(120)

  let frames = 1

  while (result.current !== burst && frames < 60) {
    frame()
    frames += 1
  }

  expect(result.current).toBe(burst)
  expect(frames).toBeLessThan(60)
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

  frame()
  expect(result.current).toBe("Se")
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

test("each frame reveals a share of the backlog, at least two characters", () => {
  const target = "x".repeat(300)

  expect(advance("", "abc")).toBe("ab")
  expect(advance("", "x".repeat(60))).toBe("x".repeat(2))
  expect(advance("", "x".repeat(90))).toBe("x".repeat(3))
  // Further behind than a sentence: the rest shows at once, then a frame's
  // share of the sentence that remains.
  expect(advance("", target)).toHaveLength(300 - 120 + 4)
  expect(advance(target, target)).toBe(target)
})
