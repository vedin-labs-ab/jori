import { beforeEach, describe, expect, test, vi } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { resolveRunAudience } from "./audience"
import { queueRun } from "./execution/outbox/data"
import { createInstructionRun } from "./instruction"

vi.mock("./execution/outbox/data", () => ({ queueRun: vi.fn() }))
vi.mock("./audience", () => ({ resolveRunAudience: vi.fn() }))

beforeEach(() => {
  vi.mocked(queueRun).mockReset().mockResolvedValue(null)
  vi.mocked(resolveRunAudience).mockReset().mockResolvedValue({
    audience: "person",
  })
})

describe("instruction child runs", () => {
  test("inherit their automation execution generation", async () => {
    const parent = automationRun()
    const insert = vi.fn(async () => "child" as Id<"runs">)
    const ctx = { db: { insert } } as unknown as MutationCtx

    await createInstructionRun(ctx, {
      organizationId: parent.organizationId,
      instructions: "Research the attendees.",
      parent,
      principal: parent.principal,
    })

    expect(insert).toHaveBeenCalledWith(
      "runs",
      expect.objectContaining({
        automation: parent.automation,
        folderId: parent.folderId,
        parentId: parent._id,
        rootId: parent._id,
      })
    )
  })
})

function automationRun(): Doc<"runs"> {
  return {
    _id: "parent-run" as Id<"runs">,
    _creationTime: 0,
    access: { integrations: [], web: false },
    automation: {
      id: "child-automation" as Id<"automations">,
      parentId: "owner-automation" as Id<"automations">,
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
      source: { type: "automation" },
      title: "Meeting Briefing",
    },
    status: "running",
    organizationId: "organization",
  }
}
