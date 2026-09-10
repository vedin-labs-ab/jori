// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { useQuery } from "convex/react"
import { type FunctionReference, getFunctionName } from "convex/server"
import { type GenericId } from "convex/values"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { useMentionSources } from "./mentions"

vi.mock("convex/react", () => ({
  useQuery: vi.fn(
    (_reference: FunctionReference<"query">, _args?: unknown) => undefined
  ),
}))

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.mocked(useQuery).mockClear()
})

/** What the resources lookup was last asked for. */
function lastLookup() {
  const call = vi
    .mocked(useQuery)
    .mock.calls.filter(
      ([reference]) => getFunctionName(reference) === "references/mentions:list"
    )
    .at(-1)

  return call?.[1]
}

test("looks resources up only while a search is on, a moment after the last keystroke", () => {
  const { result } = renderHook(() => useMentionSources("org_1"))
  const search = (query: string | null) =>
    act(() => result.current.onSearch?.(query))

  expect(lastLookup()).toBe("skip")

  // The menu opens on everything, at once.
  search("")
  expect(lastLookup()).toEqual({ organizationId: "org_1", query: "" })

  // A word typed is one lookup, once the typing pauses.
  search("r")
  search("re")
  expect(lastLookup()).toEqual({ organizationId: "org_1", query: "" })

  act(() => vi.advanceTimersByTime(150))
  expect(lastLookup()).toEqual({ organizationId: "org_1", query: "re" })

  // The search ending lets the lookup go, at once.
  search(null)
  expect(lastLookup()).toBe("skip")
})

test("an existing chat scopes resource suggestions to its execution context", () => {
  const conversationId = "conversations_shared" as GenericId<"conversations">
  const { result } = renderHook(() =>
    useMentionSources("org_1", conversationId)
  )

  act(() => result.current.onSearch?.(""))

  expect(lastLookup()).toEqual({
    organizationId: "org_1",
    conversationId,
    query: "",
  })
})
