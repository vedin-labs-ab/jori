// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import {
  cacheSizeLimit,
  type FileSource,
  fileBlobCache,
  revokeGrace,
} from "./blob"
import { displayDeadline, useDisplayUrl } from "./url"

const fetchMock = vi.fn()
let urlCounter = 0

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal("fetch", fetchMock)
  fetchMock.mockImplementation(async () => new Response("file bytes"))
  URL.createObjectURL = vi.fn(() => {
    urlCounter += 1

    return `blob:mock-${urlCounter}`
  })
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

/** Unique per call, so tests never share the module-level cache's keys. */
function sourceOf(overrides: Partial<FileSource> = {}): FileSource {
  urlCounter += 1

  return {
    fileId: `file-${urlCounter}`,
    size: 10,
    updatedAt: 1000,
    url: `https://storage.example/file-${urlCounter}`,
    ...overrides,
  }
}

test("a cached file serves its object URL instantly and stays pinned", async () => {
  const source = sourceOf()
  const cached = await fileBlobCache.load(source)

  const { result, unmount } = renderHook(() => useDisplayUrl(source))

  expect(result.current).toBe(cached.objectUrl)

  // Expiry pressure while mounted must never revoke the on-screen URL.
  await act(async () => {
    vi.advanceTimersByTime(16 * 60 * 1000)
    fileBlobCache.peek(source)
    vi.advanceTimersByTime(revokeGrace)
  })

  expect(URL.revokeObjectURL).not.toHaveBeenCalled()

  unmount()
  vi.advanceTimersByTime(revokeGrace)

  expect(URL.revokeObjectURL).toHaveBeenCalledWith(cached.objectUrl)
})

test("a hanging fetch falls back to the network URL at the deadline", async () => {
  let settle: (response: Response) => void = () => undefined
  fetchMock.mockImplementationOnce(
    () => new Promise<Response>((resolve) => (settle = resolve))
  )
  const source = sourceOf()

  const { result } = renderHook(() => useDisplayUrl(source))

  expect(result.current).toBeNull()

  await act(async () => {
    vi.advanceTimersByTime(displayDeadline)
  })

  expect(result.current).toBe(source.url)

  // The late blob only warms the cache; the streaming view keeps its URL.
  await act(async () => {
    settle(new Response("late bytes"))
  })

  expect(result.current).toBe(source.url)
  expect(fileBlobCache.peek(source)).not.toBeNull()
})

test("a failed fetch falls back to the network URL right away", async () => {
  fetchMock.mockImplementationOnce(
    async () => new Response(null, { status: 500 })
  )
  const source = sourceOf()

  const { result } = renderHook(() => useDisplayUrl(source))

  await act(async () => {})

  expect(result.current).toBe(source.url)
})

test("a file past the cache limit streams the network URL with no fetch", () => {
  const source = sourceOf({ size: cacheSizeLimit + 1 })

  const { result } = renderHook(() => useDisplayUrl(source))

  expect(result.current).toBe(source.url)
  expect(fetchMock).not.toHaveBeenCalled()
})

test("navigating past a hanging file leaves the next view untouched", async () => {
  fetchMock.mockImplementationOnce(() => new Promise<Response>(() => undefined))
  const hanging = sourceOf()
  const next = sourceOf()

  const first = renderHook(() => useDisplayUrl(hanging))
  first.unmount()
  const second = renderHook(() => useDisplayUrl(next))

  await act(async () => {})

  const url = second.result.current

  expect(url).toMatch(/^blob:/)

  // The hanging view's deadline died with it; nothing fires late.
  await act(async () => {
    vi.advanceTimersByTime(displayDeadline * 2)
  })

  expect(second.result.current).toBe(url)
})

test("a view mounting mid-preload shares the fetch and pins the result", async () => {
  let settle: (response: Response) => void = () => undefined
  fetchMock.mockImplementationOnce(
    () => new Promise<Response>((resolve) => (settle = resolve))
  )
  const source = sourceOf()
  const warm = fileBlobCache.load(source)

  const { result } = renderHook(() => useDisplayUrl(source))

  await act(async () => {
    settle(new Response("file bytes"))
  })

  const cached = await warm

  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(result.current).toBe(cached.objectUrl)

  // Retained by the view even though the preload started the fetch.
  await act(async () => {
    vi.advanceTimersByTime(16 * 60 * 1000)
    fileBlobCache.peek(source)
    vi.advanceTimersByTime(revokeGrace)
  })

  expect(URL.revokeObjectURL).not.toHaveBeenCalled()
})
