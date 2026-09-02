// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { useAutosave } from "./autosave"

const persist = vi.fn<(text: string) => Promise<boolean>>()

beforeEach(() => {
  vi.useFakeTimers()
  persist.mockReset()
  persist.mockResolvedValue(true)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function renderAutosave() {
  return renderHook(() => useAutosave(persist))
}

async function advance(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds)
  })
}

describe("autosave", () => {
  test("a burst of edits saves once with the newest text", async () => {
    const { result } = renderAutosave()

    act(() => result.current.change("a", false))
    await advance(600)
    act(() => result.current.change("ab", false))
    await advance(1200)

    expect(persist).toHaveBeenCalledExactlyOnceWith("ab")
    expect(result.current.status).toBe("saved")
  })

  test("the saved indicator goes quiet after lingering", async () => {
    const { result } = renderAutosave()

    act(() => result.current.change("a", false))
    await advance(1200)
    expect(result.current.status).toBe("saved")

    await advance(4000)
    expect(result.current.status).toBe("idle")
  })

  test("text matching the persisted content never saves", async () => {
    const { result } = renderAutosave()

    act(() => result.current.change("a", false))
    act(() => result.current.change("", true))
    await advance(5000)

    expect(persist).not.toHaveBeenCalled()
    expect(result.current.status).toBe("idle")
  })

  test("flush saves pending edits without waiting", async () => {
    const { result } = renderAutosave()

    act(() => result.current.change("a", false))
    act(() => result.current.flush())
    await advance(0)

    expect(persist).toHaveBeenCalledExactlyOnceWith("a")
  })
})

describe("autosave resilience", () => {
  test("a failed save shows the error, keeps the buffer, and retries", async () => {
    persist.mockResolvedValueOnce(false)
    const { result } = renderAutosave()

    act(() => result.current.change("a", false))
    await advance(1200)
    expect(result.current.status).toBe("error")

    await advance(3000)
    expect(persist).toHaveBeenCalledTimes(2)
    expect(persist).toHaveBeenLastCalledWith("a")
    expect(result.current.status).toBe("saved")
  })

  test("edits made during a save follow it out", async () => {
    let release: (didSave: boolean) => void = () => undefined
    persist.mockImplementationOnce(
      () => new Promise((resolve) => (release = resolve))
    )
    const { result } = renderAutosave()

    act(() => result.current.change("a", false))
    await advance(1200)
    expect(result.current.status).toBe("saving")

    act(() => result.current.change("ab", false))
    await act(async () => {
      release(true)
      await Promise.resolve()
    })
    await advance(1200)

    expect(persist).toHaveBeenCalledTimes(2)
    expect(persist).toHaveBeenLastCalledWith("ab")
  })

  test("unmount flushes pending edits", async () => {
    const { result, unmount } = renderAutosave()

    act(() => result.current.change("a", false))
    unmount()

    expect(persist).toHaveBeenCalledExactlyOnceWith("a")
  })
})
