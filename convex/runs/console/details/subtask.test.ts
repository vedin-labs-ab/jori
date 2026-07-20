import { expect, test } from "vitest"
import {
  automationDisplay,
  fakeQueryCtx,
  recurringDisplay,
} from "../../../../test/convex/console"
import { summarizeRun } from "../summaries"

// A subtask runs under Milo on behalf of its parent, so its row leads with
// Milo and names the parent instead of claiming the parent's origin.
test("a subtask names its parent run", async () => {
  const run = subtaskRun()
  const summary = await summarizeRun(
    fakeQueryCtx({ run, parent: parentRun() }),
    run
  )

  expect(summary.source).toEqual({
    type: "manual",
    surface: "milo",
    parent: { title: "Meeting Briefing" },
  })
  expect(summary.searchableText).toContain("subtask")
  expect(summary.searchableText).toContain("meeting briefing")
})

// Rows written before subtask snapshots slimmed down copied the parent's
// source and schedule; the projection still renders them as subtasks.
test("a subtask drops origin context copied from its parent", async () => {
  const run = subtaskRun({
    snapshot: {
      title: "Dossier: Acme sync",
      ...recurringDisplay({ schedule: "Weekdays at 06:00 UTC" }),
    },
  })
  const summary = await summarizeRun(
    fakeQueryCtx({ run, parent: parentRun() }),
    run
  )

  expect(summary.source.surface).toBe("milo")
  expect(summary.source.parent).toEqual({ title: "Meeting Briefing" })
  expect(summary.details.some((detail) => detail.type === "schedule")).toBe(
    false
  )
})

test("a subtask without a loadable parent stays a bare subtask", async () => {
  const run = subtaskRun()
  const summary = await summarizeRun(fakeQueryCtx({ run }), run)

  expect(summary.source.parent).toEqual({})
})

function subtaskRun(overrides: Record<string, unknown> = {}) {
  return {
    _id: "run",
    _creationTime: 0,
    organizationId: "organization",
    parentId: "parent",
    rootId: "parent",
    cause: { type: "manual", personId: "person" },
    instructions: "Research the attendees and draft the dossier.",
    snapshot: {
      title: "Dossier: Acme sync",
      ...automationDisplay({ source: { type: "manual" } }),
    },
    status: "completed",
    createdAt: 0,
    endedAt: 1000,
    ...overrides,
  } as Parameters<typeof summarizeRun>[1]
}

function parentRun() {
  return {
    _id: "parent",
    _creationTime: 0,
    organizationId: "organization",
    cause: { type: "time", scheduledAt: 0 },
    snapshot: {
      title: "Meeting Briefing",
      ...recurringDisplay({ schedule: "Weekdays at 06:00 UTC" }),
    },
    status: "completed",
    createdAt: 0,
    endedAt: 1000,
  }
}
