import { expect, test, vi } from "vitest"
import { liveRun, traces, transcript } from "../../../test/convex/console"
import { databaseContext } from "../../../test/convex/database"
import {
  appendTranscript,
  listTranscript,
} from "../../runs/execution/transcript/data"
import { clearTranscript } from "./clear"
import { compactionPrompt } from "./prompt"
import { commitSummary, readPendingSummary } from "./summary"

vi.mock("@openrouter/sdk/core", () => ({ OpenRouterCore: class {} }))
vi.mock("@openrouter/sdk/funcs/chatSend", () => ({ chatSend: vi.fn() }))

test("the pending summary covers the rows before the last three turns, as the model saw them", async () => {
  const { database, ctx } = databaseContext()
  const runId = await liveRun(database)

  await appendTranscript(
    ctx,
    runId,
    transcript().map((row) => row.message)
  )
  await clearTranscript(ctx, { runId, turn: 7 })

  const pending = await readPendingSummary(ctx, { runId, turn: 8 })

  expect(pending).toMatchObject({ before: 8, tokensBefore: 130_000 })
  expect(pending?.messages).toHaveLength(7)
  expect(pending?.messages[2]?.content).toContain("[Cleared to save context]")
  expect(pending?.messages[6]?.content).toBe('{"exitCode":0,"stdout":"ok"}')
})

test("the summary replaces the older rows for the model, once, and says so in the trace", async () => {
  const { database, ctx } = databaseContext()
  const runId = await liveRun(database)

  await appendTranscript(
    ctx,
    runId,
    transcript().map((row) => row.message)
  )
  await clearTranscript(ctx, { runId, turn: 8 })
  await commitSummary(ctx, {
    before: 8,
    content: "Task and current phase\nRenaming the table.",
    runId,
    tokensBefore: 130_000,
    turn: 8,
  })

  const seen = await listTranscript(ctx, runId)

  expect(seen).toHaveLength(6)
  expect(seen[0]).toEqual({
    content: expect.stringContaining("# Compacted history\n\n"),
    role: "user",
  })
  expect(seen[0]?.content).toContain("Renaming the table.")
  expect(seen[1]).toMatchObject({ role: "assistant" })
  // The clearing before it left its own trace; the summary's follows.
  expect((await traces(database))[1]).toEqual(
    expect.objectContaining({
      data: {
        kind: "summarized",
        fromOrder: 1,
        toOrder: 8,
        tokensBefore: 130_000,
      },
      sequence: 798,
      type: "transcript.compacted",
    })
  )

  // A retry that finds the summary written changes nothing.
  await commitSummary(ctx, {
    before: 10,
    content: "Another go.",
    runId,
    tokensBefore: 1,
    turn: 8,
  })

  expect(await database.get(runId)).toMatchObject({
    compaction: {
      clearedAtTurn: 8,
      summary: { before: 8, turn: 8 },
    },
  })
  expect(await traces(database)).toHaveLength(2)
  expect(await readPendingSummary(ctx, { runId, turn: 9 })).toBeNull()
})

test("nothing is pending while the transcript holds no more than three turns", async () => {
  const { database, ctx } = databaseContext()
  const runId = await liveRun(database)

  await appendTranscript(
    ctx,
    runId,
    transcript()
      .slice(0, 6)
      .map((row) => row.message)
  )

  expect(await readPendingSummary(ctx, { runId, turn: 4 })).toBeNull()
})

test("the summarizer sees who spoke, what was called, and the fixed sections it must fill", () => {
  const prompt = compactionPrompt(
    transcript()
      .slice(0, 3)
      .map((row) => row.message)
  )

  expect(prompt).toContain("[user]\nRename the renewals table.")
  expect(prompt).toContain('[assistant]\n(called read_file with {"path":"x"})')
  expect(prompt).toContain("[tool result: read_file]\n")
  for (const heading of [
    "Task and current phase",
    "Decisions and why",
    "Read or fetched, and what remains",
    "Identifiers touched",
    "Open questions, pending approvals and waiters",
    "Requester's constraints",
    "Do not repeat",
  ]) {
    expect(prompt).toContain(heading)
  }
  expect(prompt).toContain("Stay under 1,500 tokens.")
})
