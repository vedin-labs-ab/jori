import { expect, test, vi } from "vitest"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { deleteArtifactState } from "./storage/purge"

test("deletes state owned by a purged artifact", async () => {
  const artifactId = "artifact" as Id<"artifacts">
  const stateIds = ["state-one", "state-two"]
  const take = vi.fn(async () => stateIds.map((id) => ({ _id: id })))
  const equals = vi.fn((_field: string, _value: unknown) => ({}))
  const withIndex = vi.fn(
    (
      _name: string,
      range: (index: {
        eq: (field: string, value: unknown) => unknown
      }) => unknown
    ) => {
      range({ eq: equals })
      return { take }
    }
  )
  const query = vi.fn((_table: string) => ({ withIndex }))
  const remove = vi.fn(async (_id: unknown) => undefined)
  const ctx = { db: { delete: remove, query } } as unknown as MutationCtx

  await deleteArtifactState(ctx, artifactId)

  expect(query).toHaveBeenCalledWith("artifactState")
  expect(withIndex).toHaveBeenCalledWith(
    "by_artifact_and_scope_and_person_and_key",
    expect.any(Function)
  )
  expect(equals).toHaveBeenCalledWith("artifactId", artifactId)
  expect(take).toHaveBeenCalledWith(501)
  expect(remove.mock.calls.map(([id]) => id)).toEqual(stateIds)
})

test("fails before leaving excess artifact state orphaned", async () => {
  const rows = Array.from({ length: 501 }, (_, index) => ({
    _id: `state-${index}`,
  }))
  const take = vi.fn(async () => rows)
  const withIndex = vi.fn(() => ({ take }))
  const remove = vi.fn(async () => undefined)
  const ctx = {
    db: {
      delete: remove,
      query: vi.fn(() => ({ withIndex })),
    },
  } as unknown as MutationCtx

  await expect(
    deleteArtifactState(ctx, "artifact" as Id<"artifacts">)
  ).rejects.toThrow("too many state records")
  expect(remove).not.toHaveBeenCalled()
})
