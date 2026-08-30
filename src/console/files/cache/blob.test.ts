import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { createBlobCache, type FileSource, isCacheable } from "./blob"

const fetchMock = vi.fn()
const revoke = vi.spyOn(URL, "revokeObjectURL")

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal("fetch", fetchMock)
  fetchMock.mockImplementation(async () => new Response("file bytes"))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  revoke.mockClear()
})

function sourceOf(overrides: Partial<FileSource> = {}): FileSource {
  return {
    fileId: "file-1",
    size: 10,
    updatedAt: 1000,
    url: "https://storage.example/file-1",
    ...overrides,
  }
}

test("a hit serves the fetched blob without another network call", async () => {
  const cache = createBlobCache()
  const source = sourceOf()

  const first = await cache.load(source)
  const second = await cache.load(source)

  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(second.objectUrl).toBe(first.objectUrl)
  expect(cache.peek(source)?.objectUrl).toBe(first.objectUrl)
  expect(await second.blob.text()).toBe("file bytes")
})

test("misses on a file it has never fetched", () => {
  expect(createBlobCache().peek(sourceOf())).toBeNull()
})

test("an expired entry is evicted and refetched", async () => {
  const cache = createBlobCache({ ttl: 60_000 })
  const source = sourceOf()

  await cache.load(source)
  vi.advanceTimersByTime(61_000)

  expect(cache.peek(source)).toBeNull()
  expect(revoke).toHaveBeenCalledTimes(1)

  await cache.load(source)

  expect(fetchMock).toHaveBeenCalledTimes(2)
})

test("concurrent loads for the same file share one fetch", async () => {
  const cache = createBlobCache()
  const source = sourceOf()

  const [first, second] = await Promise.all([
    cache.load(source),
    cache.load(source),
  ])

  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(second.objectUrl).toBe(first.objectUrl)
})

test("a failed fetch is not cached and the next load retries", async () => {
  const cache = createBlobCache()
  const source = sourceOf()
  fetchMock.mockImplementationOnce(
    async () => new Response(null, { status: 403 })
  )

  await expect(cache.load(source)).rejects.toThrow("403")
  expect(cache.peek(source)).toBeNull()

  await cache.load(source)

  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(cache.peek(source)).not.toBeNull()
})

test("eviction drops the least recently used idle entry, never a retained one", async () => {
  const cache = createBlobCache({ maxEntries: 2 })
  const active = sourceOf({ fileId: "active" })
  const idle = sourceOf({ fileId: "idle" })
  const next = sourceOf({ fileId: "next" })

  const retained = await cache.load(active)
  cache.retain(active)
  vi.advanceTimersByTime(1000)
  const evicted = await cache.load(idle)
  vi.advanceTimersByTime(1000)
  await cache.load(next)

  expect(cache.peek(active)?.objectUrl).toBe(retained.objectUrl)
  expect(cache.peek(idle)).toBeNull()
  expect(cache.peek(next)).not.toBeNull()
  expect(revoke).toHaveBeenCalledExactlyOnceWith(evicted.objectUrl)
})

test("a retained entry outlives its TTL and is evicted on release", async () => {
  const cache = createBlobCache({ ttl: 60_000 })
  const source = sourceOf()

  const cached = await cache.load(source)
  cache.retain(source)
  vi.advanceTimersByTime(61_000)

  expect(cache.peek(source)?.objectUrl).toBe(cached.objectUrl)
  expect(fetchMock).toHaveBeenCalledTimes(1)

  cache.release(source)

  expect(cache.peek(source)).toBeNull()
  expect(revoke).toHaveBeenCalledExactlyOnceWith(cached.objectUrl)
})

test("a changed updatedAt misses the stale blob and refetches", async () => {
  const cache = createBlobCache()

  const before = await cache.load(sourceOf({ updatedAt: 1000 }))
  fetchMock.mockImplementationOnce(async () => new Response("saved bytes"))
  const after = await cache.load(sourceOf({ updatedAt: 2000 }))

  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(after.objectUrl).not.toBe(before.objectUrl)
  expect(await after.blob.text()).toBe("saved bytes")
})

test("total bytes over budget evict until the cache fits", async () => {
  const cache = createBlobCache({ maxBytes: 25 })
  fetchMock.mockImplementation(async () => new Response("0123456789"))

  const first = sourceOf({ fileId: "first" })
  await cache.load(first)
  vi.advanceTimersByTime(1000)
  await cache.load(sourceOf({ fileId: "second" }))
  vi.advanceTimersByTime(1000)
  await cache.load(sourceOf({ fileId: "third" }))

  expect(cache.peek(first)).toBeNull()
  expect(cache.peek(sourceOf({ fileId: "second" }))).not.toBeNull()
  expect(cache.peek(sourceOf({ fileId: "third" }))).not.toBeNull()
})

test("files over the size limit are not cacheable", () => {
  expect(isCacheable(50 * 1024 * 1024)).toBe(true)
  expect(isCacheable(50 * 1024 * 1024 + 1)).toBe(false)
})
