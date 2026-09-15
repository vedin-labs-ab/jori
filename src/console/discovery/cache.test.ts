import { type SearchResponse } from "@contracts/discovery"
import { afterEach, expect, test, vi } from "vitest"
import { candidateCache } from "./cache"

const response: SearchResponse = {
  candidates: [],
  partial: false,
  unavailable: false,
}
afterEach(() => vi.useRealTimers())

test("concurrent and fresh requests share one fetch; expired entries fetch again", async () => {
  vi.useFakeTimers()
  const cache = candidateCache(),
    fetch = vi.fn().mockResolvedValue(response)
  const first = cache.load("query", fetch)
  expect(cache.load("query", fetch)).toBe(first)
  await first
  await cache.load("query", fetch)
  expect(fetch).toHaveBeenCalledOnce()
  await vi.advanceTimersByTimeAsync(15_001)
  expect(cache.read("query")).toBeUndefined()
  await cache.load("query", fetch)
  expect(fetch).toHaveBeenCalledTimes(2)
})

test("the least recently used query is evicted after twenty entries", async () => {
  const cache = candidateCache(),
    fetch = vi.fn().mockResolvedValue(response)
  for (let index = 0; index < 20; index++) {
    await cache.load(String(index), fetch)
  }
  await cache.load("0", fetch)
  await cache.load("20", fetch)
  expect(cache.read("0")).toBe(response)
  expect(cache.read("1")).toBeUndefined()
  expect(cache.read("20")).toBe(response)
})

test.each([
  { ...response, partial: true },
  { ...response, unavailable: true },
])("incomplete responses are not cached: %j", async (incomplete) => {
  const cache = candidateCache(),
    fetch = vi.fn().mockResolvedValue(incomplete)
  await cache.load("query", fetch)
  expect(cache.read("query")).toBeUndefined()
  await cache.load("query", fetch)
  expect(fetch).toHaveBeenCalledTimes(2)
})

test("failed fetches are retried instead of reusing a rejected promise", async () => {
  const cache = candidateCache(),
    fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(response)
  await expect(cache.load("query", fetch)).rejects.toThrow("offline")
  expect(await cache.load("query", fetch)).toBe(response)
})
