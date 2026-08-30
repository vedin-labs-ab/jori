// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { revealDeadline, useViewerStatus } from "./status"

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function renderStatus(url: string | null, isImmediate = false) {
  return renderHook(
    (props: { url: string | null }) => useViewerStatus(props.url, isImmediate),
    { initialProps: { url } }
  )
}

test("stays loading until the media signals ready", () => {
  const { result } = renderStatus("blob:media")

  expect(result.current.status).toBe("loading")

  act(() => result.current.markReady())

  expect(result.current.status).toBe("ready")
})

test("media that never signals reveals at the deadline", () => {
  const { result } = renderStatus("blob:media")

  act(() => {
    vi.advanceTimersByTime(revealDeadline)
  })

  expect(result.current.status).toBe("ready")
})

test("the deadline waits for a URL before counting down", () => {
  const { rerender, result } = renderStatus(null)

  act(() => {
    vi.advanceTimersByTime(revealDeadline * 2)
  })

  expect(result.current.status).toBe("loading")

  rerender({ url: "blob:media" })
  act(() => {
    vi.advanceTimersByTime(revealDeadline)
  })

  expect(result.current.status).toBe("ready")
})

test("an error sticks and the deadline never overrides it", () => {
  const { result } = renderStatus("blob:media")

  act(() => result.current.markError())
  act(() => {
    vi.advanceTimersByTime(revealDeadline * 2)
  })

  expect(result.current.status).toBe("error")
})

test("a late error still surfaces after the deadline reveal", () => {
  const { result } = renderStatus("blob:media")

  act(() => {
    vi.advanceTimersByTime(revealDeadline)
  })
  act(() => result.current.markError())

  expect(result.current.status).toBe("error")
})

test("immediate kinds are ready as soon as they have a URL", () => {
  const { rerender, result } = renderStatus(null, true)

  expect(result.current.status).toBe("loading")

  rerender({ url: "blob:media" })

  expect(result.current.status).toBe("ready")
})
