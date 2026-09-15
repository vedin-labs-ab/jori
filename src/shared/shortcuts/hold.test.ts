// @vitest-environment jsdom
import { act, cleanup, fireEvent, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { useHeldModifiers } from "./hold"

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document.body.replaceChildren()
})
const prefix = { alt: true, shift: true }
const hold = (target = document.body) =>
  fireEvent.keyDown(target, { key: "Shift", altKey: true, shiftKey: true })
const tick = (time = 500) =>
  act(() => {
    vi.advanceTimersByTime(time)
  })

test("a short prefix press stays quiet; holding reveals help without moving focus", () => {
  const hook = renderHook(() => useHeldModifiers(prefix))
  const focused = document.activeElement
  hold()
  tick(499)
  expect(hook.result.current).toBe(false)
  tick(1)
  expect(hook.result.current).toBe(true)
  expect(document.activeElement).toBe(focused)
  fireEvent.keyUp(document.body, { key: "Shift" })
  expect(hook.result.current).toBe(false)
})

test.each(["keyup", "blur", "visibilitychange"])(
  "%s clears the hint and its pending timer",
  (event) => {
    const hook = renderHook(() => useHeldModifiers(prefix))
    hold()
    act(() => {
      ;(event === "visibilitychange" ? document : window).dispatchEvent(
        new Event(event)
      )
    })
    tick()
    expect(hook.result.current).toBe(false)
  }
)

test("a navigation key cancels help before it flashes", () => {
  const hook = renderHook(() => useHeldModifiers(prefix))
  hold()
  fireEvent.keyDown(document.body, { key: "j", altKey: true, shiftKey: true })
  tick()
  expect(hook.result.current).toBe(false)
})

test("global hints respect editing and dialogs, while a scoped hint can work in search", () => {
  document.body.innerHTML = '<div role="dialog"><input /></div>'
  const input = document.querySelector("input") as HTMLInputElement
  const scope = {
    current: document.querySelector('[role="dialog"]') as HTMLDivElement,
  }
  const global = renderHook(() => useHeldModifiers(prefix))
  const local = renderHook(() =>
    useHeldModifiers(prefix, { scope, allowInInput: true })
  )
  hold(input)
  tick()
  expect(global.result.current).toBe(false)
  expect(local.result.current).toBe(true)
  fireEvent.keyUp(input, { key: "Alt" })
  expect(local.result.current).toBe(false)
})
