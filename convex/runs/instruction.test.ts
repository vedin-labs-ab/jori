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
    scope: "person",
  })
})

describe("instruction child runs", () => {
  test("inherit their automation execution generation", async () => {
    const parent = automationRun()
    const insert = vi.fn(async () => "child" as Id<"runs">)
    const ctx = { db: { insert } } as unknown as MutationCtx

    await createInstructionRun(ctx, {
      tenantId: parent.tenantId,
      instructions: "Research the attendees.",
      parent,
      principal: parent.principal,
    })

    expect(insert).toHaveBeenCalledWith(
      "runs",
      expect.objectContaining({
        automationId: parent.automationId,
        automationParentId: parent.automationParentId,
        automationConfigurationVersion: parent.automationConfigurationVersion,
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
    automationConfigurationVersion: 4,
    automationId: "child-automation" as Id<"automations">,
    automationParentId: "owner-automation" as Id<"automations">,
    cause: { type: "time", scheduledAt: 0 },
    createdAt: 0,
    principal: {
      kind: "person",
      personId: "person" as Id<"persons">,
    },
    scope: "person",
    snapshot: {
      context: [],
      source: { type: "automation" },
      title: "Meeting Briefing",
    },
    status: "running",
    tenantId: "tenant",
  }
}
