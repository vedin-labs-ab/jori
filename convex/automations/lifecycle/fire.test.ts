import { beforeEach, describe, expect, test, vi } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { checkRunBudget } from "../../billing/guard"
import { fireAutomation } from "./fire"
import { createAutomationRun } from "./run"

vi.mock("../../billing/guard", () => ({ checkRunBudget: vi.fn() }))
vi.mock("./run", () => ({ createAutomationRun: vi.fn() }))

beforeEach(() => {
  vi.mocked(checkRunBudget).mockReset()
  vi.mocked(checkRunBudget).mockResolvedValue({ ok: true })
  vi.mocked(createAutomationRun).mockReset()
  vi.mocked(createAutomationRun).mockResolvedValue("run" as Id<"runs">)
})

describe("one-time automation firing", () => {
  test("deletes an owned child after snapshotting its run", async () => {
    const child = automation({ parentId: "parent" })
    const parent = automation({ id: "parent", type: "cron" })
    const { ctx, remove, patch } = context([child, parent])

    await expect(
      fireAutomation(ctx, { automationId: child._id, expectedAt: 1000 })
    ).resolves.toEqual({ runId: "run" })

    expect(createAutomationRun).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({ automation: child })
    )
    expect(remove).toHaveBeenCalledWith(child._id)
    expect(patch).not.toHaveBeenCalled()
  })

  test("retains an unowned child as completed history", async () => {
    const child = automation()
    const { ctx, remove, patch } = context([child])

    await fireAutomation(ctx, { automationId: child._id, expectedAt: 1000 })

    expect(remove).not.toHaveBeenCalled()
    expect(patch).toHaveBeenCalledWith(
      child._id,
      expect.objectContaining({ status: "completed" })
    )
  })

  test("drops an owned child when its parent is inactive", async () => {
    const child = automation({ parentId: "parent" })
    const parent = automation({ id: "parent", status: "paused", type: "cron" })
    const { ctx, remove } = context([child, parent])

    await expect(
      fireAutomation(ctx, { automationId: child._id, expectedAt: 1000 })
    ).resolves.toBeNull()

    expect(createAutomationRun).not.toHaveBeenCalled()
    expect(remove).toHaveBeenCalledWith(child._id)
  })

  test("drops an owned child after its parent configuration changes", async () => {
    const child = automation({
      parentId: "parent",
      parentConfigurationVersion: 1,
    })
    const parent = automation({
      configurationVersion: 2,
      id: "parent",
      type: "cron",
    })
    const { ctx, remove } = context([child, parent])

    await expect(
      fireAutomation(ctx, { automationId: child._id, expectedAt: 1000 })
    ).resolves.toBeNull()

    expect(createAutomationRun).not.toHaveBeenCalled()
    expect(remove).toHaveBeenCalledWith(child._id)
  })
})

function context(automations: Doc<"automations">[]) {
  const records = new Map(automations.map((entry) => [entry._id, entry]))
  const remove = vi.fn(async (id: Id<"automations">) => records.delete(id))
  const patch = vi.fn(async () => undefined)
  const ctx = {
    db: {
      delete: remove,
      get: vi.fn(async (id: Id<"automations">) => records.get(id) ?? null),
      patch,
    },
  } as unknown as MutationCtx

  return { ctx, patch, remove }
}

function automation(
  input: {
    id?: string
    configurationVersion?: number
    parentId?: string
    parentConfigurationVersion?: number
    status?: Doc<"automations">["status"]
    type?: Doc<"automations">["type"]
  } = {}
): Doc<"automations"> {
  return {
    _id: (input.id ?? "child") as Id<"automations">,
    _creationTime: 0,
    access: { integrations: [], web: false },
    createdAt: 0,
    configurationVersion: input.configurationVersion ?? 1,
    instructions: "Do the work.",
    name: "Automation",
    parentId: input.parentId as Id<"automations"> | undefined,
    parentConfigurationVersion:
      input.parentConfigurationVersion ??
      (input.parentId === undefined ? undefined : 1),
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
  test("completes a once automation without creating its run", async () => {
    vi.mocked(checkRunBudget).mockResolvedValue({
      ok: false,
      reason: "out-of-usage",
    })

    const child = automation()
    const { ctx, patch } = context([child])

    await expect(
      fireAutomation(ctx, { automationId: child._id, expectedAt: 1000 })
    ).resolves.toBeNull()

    expect(createAutomationRun).not.toHaveBeenCalled()
    expect(patch).toHaveBeenCalledWith(
      child._id,
      expect.objectContaining({ status: "completed" })
    )
  })
})
