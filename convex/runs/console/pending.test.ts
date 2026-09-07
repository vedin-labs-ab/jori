import { beforeEach, expect, test, vi } from "vitest"
import {
  databaseContext,
  type TestDatabase,
} from "../../../test/convex/database"
import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { pagePendingApprovals } from "./pending"
import { summarizeRun } from "./summaries"

vi.mock("./summaries", () => ({
  summarizeRun: vi.fn(
    async (
      _ctx: QueryCtx,
      run: Doc<"runs">,
      _personId: unknown,
      approval: Doc<"approvals">
    ) => ({
      id: run._id,
      approval: approval.summary,
      searchableText: run.snapshot.title.toLowerCase(),
    })
  ),
}))

const organizationId = "org"

beforeEach(() => {
  vi.mocked(summarizeRun).mockClear()
})

async function seed() {
  const { database, ctx } = databaseContext()
  const runIds = []

  for (const title of ["Alpha", "Beta", "Gamma"]) {
    runIds.push(await pendingRun(database, title))
  }

  return { ctx: ctx as unknown as QueryCtx, runIds }
}

test("a later page summarizes only the rows it serves, each with its own approval", async () => {
  const { ctx, runIds } = await seed()
  const result = await pagePendingApprovals(ctx, {
    ...scope(),
    query: "",
    paginationOpts: { cursor: "2", numItems: 1 },
  })

  expect(result).toEqual({
    continueCursor: "3",
    isDone: true,
    page: [
      { id: runIds[2], approval: "Approve Gamma", searchableText: "gamma" },
    ],
  })
  expect(vi.mocked(summarizeRun)).toHaveBeenCalledTimes(1)
})

test("a search reads every candidate's summary, since the match needs it", async () => {
  const { ctx, runIds } = await seed()
  const result = await pagePendingApprovals(ctx, {
    ...scope(),
    query: "gam",
    paginationOpts: { cursor: null, numItems: 5 },
  })

  expect(result.page.map((row) => row.id)).toEqual([runIds[2]])
  expect(vi.mocked(summarizeRun)).toHaveBeenCalledTimes(3)
})

function scope() {
  return {
    audienceFilter: "all" as const,
    organizationId,
    personId: undefined,
    runFilter: "all" as const,
  }
}

async function pendingRun(database: TestDatabase, title: string) {
  const runId = await database.insert("runs", {
    organizationId,
    audience: "organization",
    cause: { type: "manual" },
    principal: { kind: "organization" },
    snapshot: { context: [], source: { type: "manual" }, title },
    status: "running",
    createdAt: 0,
  })

  await database.insert("approvals", {
    organizationId,
    runId,
    surface: "slack",
    tool: "conversations_add_message",
    args: "{}",
    summary: `Approve ${title}`,
    code: "1234",
    status: "pending",
    requestedBy: { kind: "self", externalId: "jori" },
    createdAt: 0,
    expiresAt: Date.now() + 60_000,
  })

  return runId
}
