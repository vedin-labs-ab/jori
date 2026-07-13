import { expect, test, vi } from "vitest"
import { type Id } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { listArtifactAutomationRoots } from "./read"

test("loads only top-level automations for artifact summaries", async () => {
  const artifactId = "artifact" as Id<"artifacts">
  const equals = vi.fn()
  const take = vi.fn(async () => [])
  const index = {
    eq: (field: string, value: unknown) => {
      equals(field, value)
      return index
    },
  }
  const withIndex = vi.fn(
    (_name: string, range: (value: typeof index) => typeof index) => {
      range(index)
      return { take }
    }
  )
  const ctx = {
    db: { query: vi.fn(() => ({ withIndex })) },
  } as unknown as QueryCtx

  await listArtifactAutomationRoots(ctx, artifactId, 20)

  expect(withIndex).toHaveBeenCalledWith(
    "by_artifact_and_parent",
    expect.any(Function)
  )
  expect(equals.mock.calls).toEqual([
    ["artifactId", artifactId],
    ["parentId", undefined],
  ])
  expect(take).toHaveBeenCalledWith(20)
})
