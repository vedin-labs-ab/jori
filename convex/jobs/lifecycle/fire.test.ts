import { beforeEach, describe, expect, test, vi } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { checkRunBudget } from "../../billing/guard"
import { fireJob } from "./fire"
import { createJobRun } from "./run"

vi.mock("../../discovery/sync/intent")

vi.mock("../../billing/guard", () => ({ checkRunBudget: vi.fn() }))
vi.mock("./run", () => ({ createJobRun: vi.fn() }))

beforeEach(() => {
  vi.mocked(checkRunBudget).mockReset()
  vi.mocked(checkRunBudget).mockResolvedValue({ ok: true })
  vi.mocked(createJobRun).mockReset()
  vi.mocked(createJobRun).mockResolvedValue("run" as Id<"runs">)
})

describe("one-time job firing", () => {
  test("deletes an owned child after snapshotting its run", async () => {
    const child = job({ parentId: "parent" })
    const parent = job({ id: "parent", type: "cron" })
    const { ctx, remove, patch } = context([child, parent])

    await expect(
      fireJob(ctx, { jobId: child._id, expectedAt: 1000 })
    ).resolves.toEqual({ runId: "run" })

    expect(createJobRun).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({ job: child })
    )
    expect(remove).toHaveBeenCalledWith(child._id)
    expect(patch).not.toHaveBeenCalled()
  })

  test("retains an unowned child as completed history", async () => {
    const child = job()
    const { ctx, remove, patch } = context([child])

    await fireJob(ctx, { jobId: child._id, expectedAt: 1000 })

    expect(remove).not.toHaveBeenCalled()
    expect(patch).toHaveBeenCalledWith(
      child._id,
      expect.objectContaining({ status: "completed" })
    )
  })

  test("drops an owned child when its parent is inactive", async () => {
    const child = job({ parentId: "parent" })
    const parent = job({ id: "parent", status: "paused", type: "cron" })
    const { ctx, remove } = context([child, parent])

    await expect(
      fireJob(ctx, { jobId: child._id, expectedAt: 1000 })
    ).resolves.toBeNull()

    expect(createJobRun).not.toHaveBeenCalled()
    expect(remove).toHaveBeenCalledWith(child._id)
  })

  test("drops an owned child after its parent configuration changes", async () => {
    const child = job({ parentId: "parent", parentVersion: 1 })
    const parent = job({ version: 2, id: "parent", type: "cron" })
    const { ctx, remove } = context([child, parent])

    await expect(
      fireJob(ctx, { jobId: child._id, expectedAt: 1000 })
    ).resolves.toBeNull()

    expect(createJobRun).not.toHaveBeenCalled()
    expect(remove).toHaveBeenCalledWith(child._id)
  })
})

function context(jobs: Doc<"jobs">[]) {
  const records = new Map(jobs.map((entry) => [entry._id, entry]))
  const remove = vi.fn(async (id: Id<"jobs">) => records.delete(id))
  const patch = vi.fn(async () => undefined)
  const ctx = {
    db: {
      delete: remove,
      get: vi.fn(async (id: Id<"jobs">) => records.get(id) ?? null),
      patch,
    },
  } as unknown as MutationCtx

  return { ctx, patch, remove }
}

function job(
  input: {
    id?: string
    version?: number
    parentId?: string
    parentVersion?: number
    status?: Doc<"jobs">["status"]
    type?: Doc<"jobs">["type"]
  } = {}
): Doc<"jobs"> {
  return {
    _id: (input.id ?? "child") as Id<"jobs">,
    _creationTime: 0,
    access: { integrations: [], jori: [] },
    createdAt: 0,
    version: input.version ?? 1,
    instructions: "Do the work.",
    name: "Job",
    parent:
      input.parentId === undefined
        ? undefined
        : {
            id: input.parentId as Id<"jobs">,
            version: input.parentVersion ?? 1,
          },
    principal: {
      kind: "person",
      personId: "person" as Id<"persons">,
    },
    visibility: { mode: "private" },
    status: input.status ?? "active",
    organizationId: "organization",
    trigger:
      input.type === "cron"
        ? { expression: "0 8 * * *", nextAt: 1000, timezone: "UTC" }
        : { at: 1000 },
    type: input.type ?? "once",
    updatedAt: 0,
  }
}

describe("budget-blocked firing", () => {
  test("completes a once job without creating its run", async () => {
    vi.mocked(checkRunBudget).mockResolvedValue({
      ok: false,
      reason: "out-of-usage",
    })

    const child = job()
    const { ctx, patch } = context([child])

    await expect(
      fireJob(ctx, { jobId: child._id, expectedAt: 1000 })
    ).resolves.toBeNull()

    expect(createJobRun).not.toHaveBeenCalled()
    expect(patch).toHaveBeenCalledWith(
      child._id,
      expect.objectContaining({ status: "completed" })
    )
  })
})
