import { expect, test } from "vitest"
import { type Id } from "../../../_generated/dataModel"
import { type QueryCtx } from "../../../_generated/server"
import { summarizeRun } from "../summaries"

// A "Run now" / "Try once" run carries the job's schedule + status in
// its snapshot, but it was triggered by hand, not by the schedule.
test("a manual run drops the schedule and reads 'you' for the viewer", async () => {
  const run = manualRun("albin")
  const summary = await summarizeRun(fakeCtx({ run }), run, asPerson("albin"))

  expect(summary.source).toEqual({
    type: "job",
    surface: "jori",
    trigger: { actor: { type: "user", label: "you" } },
  })
  expect(
    summary.details.some(
      (detail) => detail.type === "schedule" || detail.type === "status"
    )
  ).toBe(false)
})

test("names the triggerer on a teammate's run", async () => {
  const run = manualRun("teammate")
  const summary = await summarizeRun(
    fakeCtx({
      run,
      identities: [{ personId: "teammate", provider: "slack", name: "Bob" }],
    }),
    run,
    asPerson("albin")
  )

  expect(summary.source.trigger).toEqual({
    actor: { type: "user", label: "Bob" },
  })
})

test("falls back to a bare label when a teammate has no name", async () => {
  const run = manualRun("ghost")
  const summary = await summarizeRun(fakeCtx({ run }), run, asPerson("albin"))

  expect(summary.source.trigger).toEqual({})
})

function asPerson(id: string) {
  return id as Id<"persons">
}

function manualRun(personId: string) {
  return {
    _id: "run",
    _creationTime: 0,
    organizationId: "organization",
    cause: { type: "manual", personId },
    snapshot: {
      title: "Morning brief",
      source: { type: "job", surface: "jori" },
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
