import { beforeEach, describe, expect, test, vi } from "vitest"
import { databaseContext } from "../../test/convex/database"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { resolveRunAudience } from "./audience"
import { startRun } from "./execution/workflow"
import { createInstructionRun } from "./instruction"

vi.mock("./execution/workflow", () => ({ startRun: vi.fn() }))
vi.mock("./audience", () => ({ resolveRunAudience: vi.fn() }))

beforeEach(() => {
  vi.mocked(startRun).mockReset().mockResolvedValue(null)
  vi.mocked(resolveRunAudience).mockReset().mockResolvedValue({
    audience: "person",
  })
})

describe("instruction child runs", () => {
  test("inherit their job execution generation", async () => {
    const parent = jobRun()
    const insert = vi.fn(async () => "child" as Id<"runs">)
    const ctx = {
      db: { ...databaseContext().database, insert },
    } as unknown as MutationCtx

    await createInstructionRun(ctx, {
      organizationId: parent.organizationId,
      instructions: "Research the attendees.",
      parent,
      principal: parent.principal,
    })

    expect(insert).toHaveBeenCalledWith(
      "runs",
      expect.objectContaining({
        job: parent.job,
        folderId: parent.folderId,
        parentId: parent._id,
        rootId: parent._id,
      })
    )
  })
})

function jobRun(): Doc<"runs"> {
  return {
    _id: "parent-run" as Id<"runs">,
    _creationTime: 0,
    access: { integrations: [], web: false },
    job: {
      id: "child-job" as Id<"jobs">,
      parentId: "owner-job" as Id<"jobs">,
      version: 4,
    },
    cause: { type: "time", scheduledAt: 0 },
    folderId: "folder" as Id<"folders">,
    createdAt: 0,
    principal: {
      kind: "person",
      personId: "person" as Id<"persons">,
    },
    audience: "person",
    snapshot: {
      context: [],
      source: { type: "job" },
      title: "Meeting Briefing",
    },
    status: "running",
    organizationId: "organization",
  }
}
