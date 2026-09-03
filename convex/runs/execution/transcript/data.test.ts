import { expect, test } from "vitest"
import { databaseContext } from "../../../../test/convex/database"
import { appendTranscript, listTranscript, tailTranscript } from "./data"

test("appends history in dense order and reads it back", async () => {
  const { ctx, database } = databaseContext()
  const runId = await database.insert("runs", {
    organizationId: "organization",
  })

  await appendTranscript(ctx, runId, [
    { role: "user", content: "Book the room." },
    { role: "assistant", content: null, toolCalls: [call("call-1")] },
  ])
  await appendTranscript(ctx, runId, [toolResult("call-1")])

  await expect(listTranscript(ctx, runId)).resolves.toEqual([
    { role: "user", content: "Book the room." },
    { role: "assistant", content: null, toolCalls: [call("call-1")] },
    toolResult("call-1"),
  ])
  await expect(database.query("transcript").collect()).resolves.toMatchObject([
    { order: 1 },
    { order: 2 },
    { order: 3 },
  ])
})

test("the tail names the last assistant turn and the results after it", async () => {
  const { ctx, database } = databaseContext()
  const runId = await database.insert("runs", {
    organizationId: "organization",
  })

  await appendTranscript(ctx, runId, [
    { role: "assistant", content: null, toolCalls: [call("call-1")] },
    toolResult("call-1"),
    { role: "assistant", content: null, toolCalls: [call("call-2")] },
    toolResult("call-2"),
  ])

  await expect(tailTranscript(ctx, runId)).resolves.toEqual({
    assistant: {
      role: "assistant",
      content: null,
      toolCalls: [call("call-2")],
    },
    results: [toolResult("call-2")],
  })
})

test("a turn that ends on a user message has no tail", async () => {
  const { ctx, database } = databaseContext()
  const runId = await database.insert("runs", {
    organizationId: "organization",
  })

  await appendTranscript(ctx, runId, [
    { role: "assistant", content: "Done." },
    { role: "user", content: "Anything else?" },
  ])

  await expect(tailTranscript(ctx, runId)).resolves.toEqual({
    assistant: null,
    results: [],
  })
})

function call(id: string) {
  return { id, name: "book_room", args: { room: "Copperline" } }
}

function toolResult(toolCallId: string) {
  return {
    role: "tool" as const,
    toolCallId,
    toolName: "book_room",
    content: "Booked.",
  }
}
