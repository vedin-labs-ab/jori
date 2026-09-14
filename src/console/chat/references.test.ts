// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react"
import { useQuery } from "convex/react"
import { afterEach, expect, test, vi } from "vitest"
import { type ChatMessage } from "@/shared/console/chat/types"
import { referenceTargets, useReferenceTargets } from "./references"

vi.mock("convex/react", () => ({ useQuery: vi.fn() }))

afterEach(() => {
  cleanup()
  vi.mocked(useQuery).mockReset()
})

function message(
  overrides: Partial<ChatMessage> & { id: string }
): ChatMessage {
  return { role: "jori", text: "", parts: [], createdAt: 0, ...overrides }
}

test("collects each target once across mentions and reference parts", () => {
  const table = { kind: "table", id: "collections:1" } as const
  const job = { kind: "job", id: "jobs:1" } as const

  expect(
    referenceTargets([
      message({ id: "m1", role: "person", references: [job] }),
      message({
        id: "m2",
        parts: [
          { kind: "reference", target: table },
          { kind: "reference", target: job },
          { kind: "choices", options: [{ label: "Open it" }] },
        ],
      }),
      message({ id: "m3", parts: [{ kind: "reference", target: job }] }),
    ])
  ).toEqual([job, table])
  expect(referenceTargets([message({ id: "m4" })])).toEqual([])
})

test("retains resolved and unavailable references while looking up only new targets", () => {
  const table = { kind: "table", id: "collections:1" } as const
  const job = { kind: "job", id: "jobs:1" } as const
  const file = { kind: "file", id: "files:1" } as const
  const { result, rerender } = renderHook(
    ({ targets }) => useReferenceTargets("org_1", targets),
    { initialProps: { targets: [table, job, file].slice(0, 2) } }
  )
  const pending = result.current

  expect(pending(table)).toEqual({ ...table, name: "Table" })
  expect(vi.mocked(useQuery).mock.lastCall?.[1]).toEqual({
    organizationId: "org_1",
    targets: [table, job],
  })

  vi.mocked(useQuery).mockReturnValue([
    { ...table, name: "Budget", detail: "Planning", unavailable: false },
    { ...job, name: "", unavailable: true },
  ])
  rerender({ targets: [table, job] })
  const resolved = result.current

  expect(resolved(table)).toEqual({
    ...table,
    name: "Budget",
    detail: "Planning",
  })
  expect(resolved(job)).toBeUndefined()
  expect(pending(table)).toEqual({ ...table, name: "Table" })
  expect(vi.mocked(useQuery).mock.lastCall?.[1]).toBe("skip")

  vi.mocked(useQuery).mockReturnValue(undefined)
  rerender({ targets: [table, job, file] })
  expect(vi.mocked(useQuery).mock.lastCall?.[1]).toEqual({
    organizationId: "org_1",
    targets: [file],
  })
  expect(result.current(table)).toEqual(resolved(table))
  expect(result.current(job)).toBeUndefined()
  expect(result.current(file)).toEqual({ ...file, name: "File" })

  vi.mocked(useQuery).mockReturnValue([
    { ...file, name: "Plan", unavailable: false },
  ])
  rerender({ targets: [file] })
  expect(result.current(file)).toEqual({ ...file, name: "Plan" })
  expect(resolved(file)).toEqual({ ...file, name: "File" })
  expect(result.current(table)).toEqual(resolved(table))
  expect(vi.mocked(useQuery).mock.lastCall?.[1]).toBe("skip")
})
