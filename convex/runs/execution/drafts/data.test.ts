import { expect, test } from "vitest"
import { databaseContext } from "../../../../test/convex/database"
import { type Id } from "../../../_generated/dataModel"
import { clearRunDraft, readRunDraft, writeRunDraft } from "./data"

const runId = "runs:1" as Id<"runs">

test("a run's draft is one row, rewritten whole and gone when cleared", async () => {
  const { database, ctx } = databaseContext()

  expect(await readRunDraft(ctx, runId)).toBeNull()

  await writeRunDraft(ctx, { runId, reasoning: "Checking.", text: "", turn: 1 })
  await writeRunDraft(ctx, {
    runId,
    reasoning: "Checking.",
    text: "On",
    turn: 1,
  })
  await writeRunDraft(ctx, {
    runId,
    reasoning: "Checking.",
    text: "On it.",
    turn: 1,
  })

  expect(await rows(database)).toEqual([
    expect.objectContaining({
      runId,
      reasoning: "Checking.",
      text: "On it.",
      turn: 1,
    }),
  ])
  expect(await readRunDraft(ctx, runId)).toEqual({
    reasoning: "Checking.",
    text: "On it.",
  })

  await clearRunDraft(ctx, runId)
  await clearRunDraft(ctx, runId)

  expect(await rows(database)).toEqual([])
  expect(await readRunDraft(ctx, runId)).toBeNull()
})

test("a row with nothing said yet reads as no draft", async () => {
  const { ctx } = databaseContext()

  await writeRunDraft(ctx, { runId, reasoning: " \n", text: "", turn: 1 })

  expect(await readRunDraft(ctx, runId)).toBeNull()

  await writeRunDraft(ctx, { runId, reasoning: "Reading", text: "", turn: 1 })

  expect(await readRunDraft(ctx, runId)).toEqual({
    reasoning: "Reading",
    text: "",
  })
})

test("a later turn takes the row over", async () => {
  const { database, ctx } = databaseContext()

  await writeRunDraft(ctx, { runId, reasoning: "", text: "First", turn: 1 })
  await writeRunDraft(ctx, { runId, reasoning: "", text: "Se", turn: 2 })

  expect(await rows(database)).toEqual([
    expect.objectContaining({ text: "Se", turn: 2 }),
  ])
})

async function rows(database: ReturnType<typeof databaseContext>["database"]) {
  return await database.query("drafts").withIndex("by_run").collect()
}
