// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest"

const loadGrammars = vi.fn()

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  loadGrammars.mockClear()
  vi.doMock("./grammars", () => {
    loadGrammars()
    return { GrammarCode: () => null }
  })
})

afterEach(async () => {
  await vi.dynamicImportSettled()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.doUnmock("./grammars")
})

test("unmount cancels the timer without preventing a later mount", async () => {
  const { prefetchGrammars } = await import("./prefetch")
  const cancel = prefetchGrammars()

  expect(vi.getTimerCount()).toBe(1)
  cancel?.()
  expect(vi.getTimerCount()).toBe(0)
  await vi.advanceTimersByTimeAsync(200)
  expect(loadGrammars).not.toHaveBeenCalled()

  prefetchGrammars()
  await vi.advanceTimersByTimeAsync(200)
  await vi.dynamicImportSettled()
  expect(loadGrammars).toHaveBeenCalledOnce()
})

test("cancels idle work and allows a surviving mount to prefetch", async () => {
  const callbacks = new Map<number, IdleRequestCallback>()
  const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
    const handle = callbacks.size + 1
    callbacks.set(handle, callback)
    return handle
  })
  const cancelIdleCallback = vi.fn((handle: number) => callbacks.delete(handle))
  vi.stubGlobal("requestIdleCallback", requestIdleCallback)
  vi.stubGlobal("cancelIdleCallback", cancelIdleCallback)
  const { prefetchGrammars } = await import("./prefetch")
  const cancel = prefetchGrammars()
  prefetchGrammars()

  cancel?.()
  expect(cancelIdleCallback).toHaveBeenCalledWith(1)
  expect(callbacks.size).toBe(1)
  for (const callback of callbacks.values()) {
    callback({ didTimeout: false, timeRemaining: () => 20 })
  }
  await vi.dynamicImportSettled()
  expect(loadGrammars).toHaveBeenCalledOnce()
  expect(prefetchGrammars()).toBeUndefined()
  expect(requestIdleCallback).toHaveBeenCalledTimes(2)
})

test("concurrent mounted markdown imports the grammars only once", async () => {
  const { prefetchGrammars } = await import("./prefetch")
  prefetchGrammars()
  prefetchGrammars()

  await vi.advanceTimersByTimeAsync(200)
  await vi.dynamicImportSettled()

  expect(loadGrammars).toHaveBeenCalledOnce()
  expect(prefetchGrammars()).toBeUndefined()
  expect(vi.getTimerCount()).toBe(0)
})
