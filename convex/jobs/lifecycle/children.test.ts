import { describe, expect, test, vi } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import {
  deleteOwnedJobs,
  hasInactiveParent,
  requireValidOwnershipUpdate,
} from "./children"

describe("owned job cleanup", () => {
  test("deletes a bounded batch and schedules continuation", async () => {
    const parentId = "parent" as Id<"jobs">
    const children = Array.from({ length: 51 }, (_, index) =>
      job({
        id: `child-${index}`,
        parentId,
        trigger: {
          at: index + 1,
          functionId: `function-${index}` as Id<"_scheduled_functions">,
        },
        type: "once",
      })
    )
    const { ctx, deletedIds, take, cancel, runAfter } = cleanupContext(children)

    await deleteOwnedJobs(ctx, parentId)

    expect(take).toHaveBeenCalledWith(50)
    expect(deletedIds).toHaveLength(50)
    expect(cancel).toHaveBeenCalledTimes(50)
    expect(runAfter).toHaveBeenCalledTimes(1)
    expect(runAfter).toHaveBeenCalledWith(0, expect.anything(), { parentId })

    await deleteOwnedJobs(ctx, parentId)

    expect(deletedIds).toHaveLength(51)
    expect(cancel).toHaveBeenCalledTimes(51)
    expect(runAfter).toHaveBeenCalledTimes(1)
  })
})

describe("owned job parents", () => {
  test.each([
    ["missing", null],
    ["paused", job({ status: "paused" })],
    [
      "wrong principal",
      job({
        principal: {
          kind: "person",
          personId: "another-person" as Id<"persons">,
        },
      }),
    ],
  ])("treats a %s parent as inactive", async (_label, parent) => {
    const child = job({ parentId: "parent" })
    const ctx = parentContext(parent)

    await expect(hasInactiveParent(ctx, child)).resolves.toBe(true)
  })

  test("accepts an active parent in the same scope", async () => {
    const child = job({ parentId: "parent" })
    const ctx = parentContext(job())

    await expect(hasInactiveParent(ctx, child)).resolves.toBe(false)
  })

  test("rejects a child from an older parent configuration", async () => {
    const child = job({ parentId: "parent", parentVersion: 1 })
    const parent = job({ version: 2 })

    await expect(hasInactiveParent(parentContext(parent), child)).resolves.toBe(
      true
    )
  })
})

describe("ownership updates", () => {
  test("keeps owned jobs one-time and in their original scope", async () => {
    const owned = job({ parentId: "parent", type: "once" })
    const ctx = parentContext(null)

    await expect(
      requireValidOwnershipUpdate(ctx, { type: "cron" }, owned)
    ).rejects.toThrow("cannot change type or sharing")
    await expect(
      requireValidOwnershipUpdate(
        ctx,
        { visibility: { mode: "organization" } },
        owned
      )
    ).rejects.toThrow("cannot change type or sharing")
    await expect(
      requireValidOwnershipUpdate(
        ctx,
        { visibility: { mode: "private" }, type: "once" },
        owned
      )
    ).resolves.toBeUndefined()
  })

  test("does not convert a durable parent while it owns jobs", async () => {
    const parent = job()
    const child = job({ parentId: parent._id, type: "once" })
    const { ctx } = cleanupContext([parent, child])

    await expect(
      requireValidOwnershipUpdate(ctx, { type: "once" }, parent)
    ).rejects.toThrow("Remove owned jobs")
  })

  test("allows a durable job without children to become one-time", async () => {
    const parent = job()
    const { ctx } = cleanupContext([parent])

    await expect(
      requireValidOwnershipUpdate(ctx, { type: "once" }, parent)
    ).resolves.toBeUndefined()
  })
})

function cleanupContext(seed: Doc<"jobs">[]) {
  const records = new Map(seed.map((record) => [record._id, record]))
  const deletedIds: Id<"jobs">[] = []
  const take = vi.fn(async (limit: number) =>
    [...records.values()]
      .filter((record) => record.parent?.id === selectedParentId)
      .slice(0, limit)
  )
  const first = vi.fn(
    async () =>
      [...records.values()].find(
        (record) => record.parent?.id === selectedParentId
      ) ?? null
  )
  const cancel = vi.fn(async () => undefined)
  const runAfter = vi.fn(async () => "scheduled")
  let selectedParentId: Id<"jobs"> | undefined

  const ctx = {
    db: {
      delete: vi.fn(async (id: Id<"jobs">) => {
        deletedIds.push(id)
        records.delete(id)
      }),
      query: vi.fn(() => ({
        withIndex: vi.fn(
          (
            _name: string,
            configure: (index: {
              eq: (field: "parentId", value: Id<"jobs">) => unknown
            }) => void
          ) => {
            configure({
              eq: (_field, value) => {
                selectedParentId = value
                return undefined
              },
            })

            return { first, take }
          }
        ),
      })),
    },
    scheduler: { cancel, runAfter },
  } as unknown as MutationCtx

  return { cancel, ctx, deletedIds, runAfter, take }
}

function parentContext(parent: Doc<"jobs"> | null) {
  return {
    db: { get: vi.fn(async () => parent) },
  } as unknown as MutationCtx
}

function job(
  input: {
    id?: string
    version?: number
    parentId?: string | Id<"jobs">
    parentVersion?: number
    principal?: Doc<"jobs">["principal"]
    status?: Doc<"jobs">["status"]
    trigger?: Doc<"jobs">["trigger"]
    type?: Doc<"jobs">["type"]
  } = {}
): Doc<"jobs"> {
  return {
    _id: (input.id ?? "parent") as Id<"jobs">,
    _creationTime: 0,
    organizationId: "organization",
    name: "Job",
    instructions: "Do the work.",
    visibility: { mode: "private" },
    principal: input.principal ?? {
      kind: "person",
      personId: "person" as Id<"persons">,
    },
    access: { integrations: [], jori: [] },
    version: input.version ?? 1,
    type: input.type ?? "cron",
    trigger: input.trigger ?? {
      expression: "0 8 * * *",
      timezone: "UTC",
      nextAt: 1,
    },
    status: input.status ?? "active",
    parent:
      input.parentId === undefined
        ? undefined
        : {
            id: input.parentId as Id<"jobs">,
            version: input.parentVersion ?? 1,
          },
    createdAt: 0,
    updatedAt: 0,
  }
}
