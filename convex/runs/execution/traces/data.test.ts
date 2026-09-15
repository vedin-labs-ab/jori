import { expect, test, vi } from "vitest"
import { databaseContext } from "../../../../test/convex/database"
import { type Doc } from "../../../_generated/dataModel"
import { stopRunTree } from "../../tree"
import { readRunDraft, writeRunDraft } from "../drafts/data"
import { recordWorkerTrace } from "./data"

vi.mock("../../../discovery/sync/intent")

test.each([
  ["completes", { type: "run.completed" as const }],
  ["fails", { data: { error: "Boom" }, type: "run.failed" as const }],
])("a run that %s leaves no draft behind", async (_outcome, trace) => {
  const { database, ctx } = databaseContext()
  const runId = await liveRun(database)

  await writeRunDraft(ctx, { runId, reasoning: "", text: "Nearly", turn: 3 })
  await recordWorkerTrace(ctx, {
    ...trace,
    key: `${runId}:300:${trace.type}`,
    runId,
    sequence: 300,
  })

  expect(await database.get(runId)).toMatchObject({
    status: trace.type === "run.completed" ? "completed" : "failed",
  })
  expect(await readRunDraft(ctx, runId)).toBeNull()
})

test("a stopped run leaves no draft behind", async () => {
  const { database, ctx } = databaseContext()
  const runId = await liveRun(database)

  await writeRunDraft(ctx, { runId, reasoning: "", text: "Nearly", turn: 3 })
  await stopRunTree(ctx, (await database.get(runId)) as Doc<"runs">)

  expect(await database.get(runId)).toMatchObject({ status: "stopped" })
  expect(await readRunDraft(ctx, runId)).toBeNull()
})

async function liveRun(
  database: ReturnType<typeof databaseContext>["database"]
) {
  return await database.insert("runs", {
    organizationId: "org",
    audience: "organization",
    cause: { type: "manual" },
    principal: { kind: "organization" },
    snapshot: { context: [], source: { type: "manual" }, title: "Run" },
    status: "running",
    createdAt: 0,
  })
}
