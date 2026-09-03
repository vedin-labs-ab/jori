import { beforeEach, expect, test, vi } from "vitest"
import { jobDoc } from "../../../test/convex/folders"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { resolveRunAudience } from "../../runs/audience"
import { startRun } from "../../runs/execution/workflow"
import { createJobRun } from "./run"

vi.mock("../../runs/execution/workflow", () => ({ startRun: vi.fn() }))
vi.mock("../../runs/audience", () => ({ resolveRunAudience: vi.fn() }))

beforeEach(() => {
  vi.mocked(startRun).mockReset().mockResolvedValue(null)
  vi.mocked(resolveRunAudience)
    .mockReset()
    .mockResolvedValue({ audience: "organization" })
})

// Attribution is stamped at creation and never joined at read time, so a run
// keeps costing the folder its job was filed in when it fired.

test("a run is stamped with the folder its job is filed in", async () => {
  const { ctx, insert } = context()

  await createJobRun(ctx, {
    job: job("folder" as Id<"folders">),
    cause: { type: "time", scheduledAt: 1 },
    now: 1,
  })

  expect(insert).toHaveBeenCalledWith(
    "runs",
    expect.objectContaining({ folderId: "folder" })
  )
})

test("an unfiled job leaves its runs unfiled", async () => {
  const { ctx, insert } = context()

  await createJobRun(ctx, {
    job: job(undefined),
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

function job(folderId: Id<"folders"> | undefined): Doc<"jobs"> {
  return {
    _id: "job" as Id<"jobs">,
    _creationTime: 0,
    ...jobDoc({ folderId }),
  } as unknown as Doc<"jobs">
}
