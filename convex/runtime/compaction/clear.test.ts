import { expect, test } from "vitest"
import { liveRun, traces, transcript } from "../../../test/convex/console"
import { databaseContext } from "../../../test/convex/database"
import {
  appendTranscript,
  listTranscript,
} from "../../runs/execution/transcript/data"
import { clearTranscript } from "./clear"

test("clearing moves the boundary forward, records it once, and stubs what it passed", async () => {
  const { database, ctx } = databaseContext()
  const runId = await liveRun(database)

  await appendTranscript(
    ctx,
    runId,
    transcript().map((row) => row.message)
  )
  await clearTranscript(ctx, { runId, turn: 7 })

  expect(await database.get(runId)).toMatchObject({
    compaction: { clearedAtTurn: 7, clearedBefore: 6 },
  })
  expect(await traces(database)).toEqual([
    expect.objectContaining({
      data: {
        kind: "cleared",
        fromOrder: 1,
        toOrder: 6,
        tokensBefore: 130_000,
      },
      key: `${runId}:697:transcript.compacted`,
      sequence: 697,
      type: "transcript.compacted",
    }),
  ])

  const seen = await listTranscript(ctx, runId)

  expect(seen[2]?.content).toContain("[Cleared to save context] read_file")
  expect(seen[4]?.content).toContain("[Cleared to save context] list_items")
  expect(seen[6]?.content).toBe('{"exitCode":0,"stdout":"ok"}')

  // The same transcript on the next turn moves nothing and records nothing.
  await clearTranscript(ctx, { runId, turn: 8 })

  expect(await database.get(runId)).toMatchObject({
    compaction: { clearedAtTurn: 8, clearedBefore: 6 },
  })
  expect(await traces(database)).toHaveLength(1)

  // Another turn makes the next tool result old enough to clear.
  await appendTranscript(ctx, runId, [
    {
      content: null,
      role: "assistant",
      toolCalls: [{ args: {}, id: "call_13", name: "bash" }],
    },
    {
      content: '{"exitCode":1}',
      role: "tool",
      toolCallId: "call_13",
      toolName: "bash",
    },
  ])
  await clearTranscript(ctx, { runId, turn: 9 })

  expect(await database.get(runId)).toMatchObject({
    compaction: { clearedAtTurn: 9, clearedBefore: 8 },
  })
  expect((await traces(database))[1]).toMatchObject({
    data: { fromOrder: 6, toOrder: 8 },
    sequence: 897,
  })
  expect((await listTranscript(ctx, runId))[6]?.content).toContain(
    "[Cleared to save context] bash returned an object with 2 keys."
  )
})

test("a run with no more than the kept turns clears nothing but notes the attempt", async () => {
  const { database, ctx } = databaseContext()
  const runId = await liveRun(database)

  await appendTranscript(
    ctx,
    runId,
    transcript()
      .slice(0, 8)
      .map((row) => row.message)
  )
  await clearTranscript(ctx, { runId, turn: 5 })

  expect(await database.get(runId)).toMatchObject({
    compaction: { clearedAtTurn: 5 },
  })
  expect((await database.get(runId))?.compaction).not.toHaveProperty(
    "clearedBefore"
  )
  expect(await traces(database)).toEqual([])
})

test("a finished run is left alone", async () => {
  const { database, ctx } = databaseContext()
  const runId = await liveRun(database, "completed")

  await appendTranscript(
    ctx,
    runId,
    transcript().map((row) => row.message)
  )
  await clearTranscript(ctx, { runId, turn: 7 })

  expect((await database.get(runId))?.compaction).toBeUndefined()
})
