import { beforeEach, expect, test, vi } from "vitest"
import { automationDoc } from "../../../test/convex/folders"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { resolveRunAudience } from "../../runs/audience"
import { queueRun } from "../../runs/execution/outbox/data"
import { createAutomationRun } from "./run"

vi.mock("../../runs/execution/outbox/data", () => ({ queueRun: vi.fn() }))
vi.mock("../../runs/audience", () => ({ resolveRunAudience: vi.fn() }))

beforeEach(() => {
  vi.mocked(queueRun).mockReset().mockResolvedValue(null)
  vi.mocked(resolveRunAudience)
    .mockReset()
    .mockResolvedValue({ audience: "organization" })
})

// Attribution is stamped at creation and never joined at read time, so a run
// keeps costing the folder its automation was filed in when it fired.

test("a run is stamped with the folder its automation is filed in", async () => {
  const { ctx, insert } = context()

  await createAutomationRun(ctx, {
    automation: automation("folder" as Id<"folders">),
    cause: { type: "time", scheduledAt: 1 },
    now: 1,
  })

  expect(insert).toHaveBeenCalledWith(
    "runs",
    expect.objectContaining({ folderId: "folder" })
  )
})

test("an unfiled automation leaves its runs unfiled", async () => {
  const { ctx, insert } = context()

  await createAutomationRun(ctx, {
    automation: automation(undefined),
    cause: { type: "time", scheduledAt: 1 },
    now: 1,
  })

  expect(insert).toHaveBeenCalledWith(
    "runs",
    expect.objectContaining({ folderId: undefined })
  )
})

function context() {
  const insert = vi.fn(async () => "run" as Id<"runs">)

  return {
    insert,
    ctx: { db: { insert, patch: vi.fn() } } as unknown as MutationCtx,
  }
}

function automation(folderId: Id<"folders"> | undefined): Doc<"automations"> {
  return {
    _id: "automation" as Id<"automations">,
    _creationTime: 0,
    ...automationDoc({ folderId }),
  } as unknown as Doc<"automations">
}
