// @vitest-environment jsdom
import { type Hit, type SearchResponse } from "@contracts/discovery"
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { useCandidates, useSearch } from "./query"

const mocks = vi.hoisted(() => ({ search: vi.fn(), visible: vi.fn() }))
vi.mock("convex/react", () => ({
  useAction: () => mocks.search,
  useQueries: (queries: object) => mocks.visible(queries),
}))
beforeEach(() => {
  vi.useFakeTimers()
  mocks.visible.mockReturnValue({})
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.resetAllMocks()
})
const candidate = { key: "files:invoice", revision: "1", part: 1, score: 1 }
const response: SearchResponse = {
  candidates: [candidate],
  partial: false,
  unavailable: false,
}
async function tick() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(150)
  })
}

test("typing is debounced and a late response cannot replace a newer query", async () => {
  let old: (value: SearchResponse) => void = () => undefined
  mocks.search
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          old = resolve
        })
    )
    .mockResolvedValueOnce({ ...response, candidates: [] })
  const hook = renderHook(({ text }) => useCandidates("workspace", text, 0), {
    initialProps: { text: "old" },
  })
  expect(mocks.search).not.toHaveBeenCalled()
  await tick()
  hook.rerender({ text: "new" })
  await tick()
  expect(hook.result.current?.candidates).toEqual([])
  await act(async () => {
    old(response)
  })
  expect(hook.result.current?.candidates).toEqual([])
})

test("workspace changes clear candidates immediately and retry actually issues a request", async () => {
  mocks.search.mockResolvedValue(response)
  const hook = renderHook(
    ({ org, retry }) => useCandidates(org, "invoice", retry),
    { initialProps: { org: "one", retry: 0 } }
  )
  await tick()
  expect(hook.result.current).toEqual(response)
  hook.rerender({ org: "two", retry: 0 })
  expect(hook.result.current).toBeUndefined()
  await tick()
  hook.rerender({ org: "two", retry: 1 })
  expect(hook.result.current).toBeUndefined()
  await tick()
  expect(mocks.search).toHaveBeenCalledTimes(3)
})

test("reactive authorization removes a revoked hit without another search", async () => {
  mocks.search.mockResolvedValue(response)
  const hit = {
    candidate,
    kind: "file",
    resourceId: "invoice",
    title: "Invoice",
    resourceName: "Invoice",
    snippet: "Sensitive",
    location: { kind: "resource", id: "invoice" },
  } satisfies Hit
  mocks.visible.mockImplementation((queries) =>
    Object.keys(queries).length ? { "0": [hit] } : {}
  )
  const hook = renderHook(() => useSearch("workspace", "invoice"))
  await tick()
  expect(hook.result.current.hits).toEqual([hit])
  mocks.visible.mockReturnValue({ "0": [] })
  hook.rerender()
  expect(hook.result.current.hits).toEqual([])
  expect(mocks.search).toHaveBeenCalledOnce()
})
