import { expect, test } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { loadCandidateRuns, type SearchRunArgs } from "./runs"

test("loads candidates by explicit search mode", async () => {
  const harness = context()
  const current = run({
    scope: "conversation",
    conversationId: id<"conversations">("conversation"),
  })

  await loadCandidateRuns(harness.ctx, current, {
    mode: "search",
    parentId: "run_parent",
    rootId: "run_root",
    runIds: ["run_known"],
    scope: "conversation",
  })
  await loadCandidateRuns(harness.ctx, current, {
    mode: "ids",
    runIds: ["run_known"],
  })
  await loadCandidateRuns(harness.ctx, current, {
    mode: "children",
    parentId: "run_parent",
  })
  await loadCandidateRuns(harness.ctx, current, {
    mode: "tree",
    rootId: "run_root",
  })

  expect(harness.events).toEqual([
    "query:by_conversation_and_created_at",
    "get:run_known",
    "query:by_parent",
    "query:by_root",
  ])
})

test("returns no candidates when a mode is missing its target id", async () => {
  const harness = context()

  expect(
    await loadCandidateRuns(harness.ctx, run({}), {
      mode: "children",
    } as SearchRunArgs)
  ).toEqual([])
  expect(harness.events).toEqual([])
})

function context() {
  const events: string[] = []

  return {
    ctx: {
      db: {
        get: async (runId: Id<"runs">) => {
          events.push(`get:${runId}`)
          return run({ _id: runId })
        },
        normalizeId: (_tableName: "runs", value: string) =>
          value.startsWith("run_") ? id<"runs">(value) : null,
        query: (_tableName: "runs") => query(events),
      },
    } as unknown as QueryCtx,
    events,
  }
}

function query(events: string[]) {
  return {
    withIndex: (name: string, build: (query: EqBuilder) => unknown) => {
      events.push(`query:${name}`)
      build(eqBuilder)

      return {
        order: (_direction: "desc") => ({
          take: async (_limit: number) => [],
        }),
      }
    },
  }
}

type EqBuilder = {
  eq: (field: string, value: unknown) => EqBuilder
}

const eqBuilder: EqBuilder = {
  eq: () => eqBuilder,
}

function run(overrides: Partial<Doc<"runs">>): Doc<"runs"> {
  return {
    _creationTime: 0,
    _id: id<"runs">("run"),
    principal: { kind: "organization" },
    scope: "tenant",
    cause: { type: "manual" },
    createdAt: 0,
    snapshot: { context: [], source: { type: "manual" }, title: "Run" },
    status: "running",
    tenantId: "tenant",
    ...overrides,
  }
}

function id<TableName extends "conversations" | "runs">(value: string) {
  return value as Id<TableName>
}
