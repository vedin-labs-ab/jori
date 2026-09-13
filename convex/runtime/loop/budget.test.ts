import { expect, test } from "vitest"
import { databaseContext } from "../../../test/convex/database"
import { type Doc } from "../../_generated/dataModel"
import { budgetError, budgetSequence, checkTurnBudget } from "./budget"

const organizationId = "org"

test("a run whose organization ran dry fails before its next turn, with the reason in the chat's words", async () => {
  const { database, ctx } = databaseContext()
  const runId = await liveRun(database, { type: "manual" })

  await database.insert("accounts", {
    organizationId,
    state: { kind: "active" },
    micros: { allowance: 0, wallet: -3_000_000 },
    topUp: { charged: { micros: 0 } },
    updatedAt: 0,
  })

  expect(await checkTurnBudget(ctx, { runId, turn: 4 })).toBe("blocked")
  expect(await database.get(runId)).toMatchObject({
    status: "failed",
    error: budgetError("out-of-usage"),
  })

  const [trace] = await database
    .query("traces")
    .withIndex("by_run_and_timestamp", (query) => query.eq("runId", runId))
    .collect()

  expect(trace).toMatchObject({
    type: "run.failed",
    sequence: budgetSequence(4),
    key: `${runId}:${budgetSequence(4)}:run.failed`,
  })
  expect(budgetError("out-of-usage")).toMatch(/^Jori is out of usage/)
})

test("interactive work keeps its grace below zero; scheduled work stops at it", async () => {
  const { database, ctx } = databaseContext()
  const interactive = await liveRun(database, { type: "manual" })
  const scheduled = await liveRun(database, { type: "time", scheduledAt: 0 })

  await database.insert("accounts", {
    organizationId,
    state: { kind: "active" },
    micros: { allowance: 0, wallet: -500_000 },
    topUp: { charged: { micros: 0 } },
    updatedAt: 0,
  })

  expect(await checkTurnBudget(ctx, { runId: interactive, turn: 2 })).toBe("ok")
  expect(await checkTurnBudget(ctx, { runId: scheduled, turn: 2 })).toBe(
    "blocked"
  )
  expect(await database.get(interactive)).toMatchObject({ status: "running" })
  expect(await database.get(scheduled)).toMatchObject({
    status: "failed",
    error: budgetError("out-of-usage"),
  })
})

test("a run that already ended is left as it is", async () => {
  const { database, ctx } = databaseContext()
  const runId = await liveRun(database, { type: "manual" })

  await database.patch(runId, { status: "stopped" })
  await database.insert("accounts", {
    organizationId,
    state: { kind: "paused" },
    micros: { allowance: 0, wallet: 0 },
    topUp: { charged: { micros: 0 } },
    updatedAt: 0,
  })

  expect(await checkTurnBudget(ctx, { runId, turn: 2 })).toBe("ok")
  expect(await database.get(runId)).toMatchObject({ status: "stopped" })
})

async function liveRun(
  database: ReturnType<typeof databaseContext>["database"],
  cause: Doc<"runs">["cause"]
) {
  return await database.insert("runs", {
    organizationId,
    audience: "organization",
    cause,
    principal: { kind: "organization" },
    snapshot: { context: [], source: { type: "manual" }, title: "Run" },
    status: "running",
    createdAt: 0,
  })
}
