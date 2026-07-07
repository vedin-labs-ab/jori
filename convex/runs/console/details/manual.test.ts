import { expect, test } from "vitest"
import { type QueryCtx } from "../../../_generated/server"
import { summarizeRun } from "../summaries"

// A "Run now" / "Try once" run carries the automation's schedule + status in
// its snapshot, but it was triggered by hand, not by the schedule.
test("a manual run drops the schedule and names who triggered it", async () => {
  const run = manualRun("albin")
  const summary = await summarizeRun(
    fakeCtx({
      run,
      identities: [{ personId: "albin", provider: "slack", name: "Albin" }],
    }),
    run
  )

  expect(summary.source).toEqual({
    type: "automation",
    surface: "milo",
    trigger: { actor: { type: "user", label: "Albin" } },
  })
  expect(
    summary.details.some(
      (detail) => detail.type === "schedule" || detail.type === "status"
    )
  ).toBe(false)
})

test("falls back to a bare label when the triggerer has no name", async () => {
  const run = manualRun("ghost")
  const summary = await summarizeRun(fakeCtx({ run }), run)

  expect(summary.source.trigger).toEqual({})
})

function manualRun(personId: string) {
  return {
    _id: "run",
    _creationTime: 0,
    tenantId: "tenant",
    cause: { type: "manual", personId },
    snapshot: {
      title: "Morning brief",
      source: { type: "automation", surface: "milo" },
      context: [
        { type: "schedule", label: "Weekdays at 06:00 UTC" },
        { type: "status", label: "Paused" },
      ],
    },
    status: "completed",
    createdAt: 0,
    endedAt: 1000,
  } as Parameters<typeof summarizeRun>[1]
}

function fakeCtx({
  run,
  identities = [],
}: {
  run: Parameters<typeof summarizeRun>[1]
  identities?: unknown[]
}) {
  return {
    db: {
      get: async (id: string) => (id === "run" ? run : null),
      query: (table: string) => ({
        withIndex: () =>
          table === "identities" ? identityResult(identities) : emptyResult(),
      }),
    },
  } as unknown as QueryCtx
}

function identityResult(identities: unknown[]) {
  return { collect: async () => identities }
}

function emptyResult() {
  return {
    async *[Symbol.asyncIterator]() {},
    collect: async () => [],
    first: async () => null,
    order: () => emptyResult(),
    take: async () => [],
  }
}
