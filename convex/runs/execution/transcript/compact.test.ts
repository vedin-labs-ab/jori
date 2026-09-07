import { expect, test } from "vitest"
import { encodeToolResult } from "../../../../contracts/json"
import { toolRow, transcript } from "../../../../test/convex/console"
import { compactTranscript, keepBoundary } from "./compact"

const cleared = "[Cleared to save context]"
const rerun = "Re-run the tool to see the full result."

test("the boundary opens the last few assistant turns and is null without older ones", () => {
  const rows = transcript()

  expect(keepBoundary(rows, 4)).toBe(6)
  expect(keepBoundary(rows, 3)).toBe(8)
  expect(keepBoundary(rows, 5)).toBe(4)
  expect(keepBoundary(rows, 6)).toBeNull()
  expect(keepBoundary([], 1)).toBeNull()
})

test("an uncondensed run reads its rows whole", () => {
  const rows = transcript()

  expect(compactTranscript(rows, undefined)).toEqual(
    rows.map((row) => row.message)
  )
})

test("clearing stubs the tool results older than the kept turns and leaves the rest whole", () => {
  const rows = transcript()
  const messages = compactTranscript(rows, {
    clearedAtTurn: 7,
    clearedBefore: 6,
  })

  expect(messages).toHaveLength(rows.length)
  expect(messages[2]).toEqual({
    content: `${cleared} read_file returned a string of 600 characters starting: ${JSON.stringify("x".repeat(500))}. ${rerun}`,
    role: "tool",
    toolCallId: "call_3",
    toolName: "read_file",
  })
  expect(messages[4]).toMatchObject({
    content: `${cleared} list_items returned an object with 2 keys holding 2 items with more to page. ${rerun}`,
  })
  expect(messages[6]).toEqual(rows[6]?.message)
  expect(messages[8]).toEqual(rows[8]?.message)
  expect(messages[10]).toEqual(rows[10]?.message)
  // Assistant and user rows are never touched, whatever their order.
  expect(messages[1]).toEqual(rows[1]?.message)
  expect(messages[0]).toEqual(rows[0]?.message)
})

test("every result shape has a stub", () => {
  const stub = (content: string) =>
    compactTranscript([{ message: toolRow(9, "probe", content), order: 1 }], {
      clearedAtTurn: 2,
      clearedBefore: 2,
    })[0]?.content

  expect(stub(encodeToolResult([1, 2, 3]))).toContain(
    "returned an array of 3 items."
  )
  expect(stub(encodeToolResult(42))).toContain("returned the number 42.")
  expect(stub(encodeToolResult(true))).toContain("returned a boolean.")
  expect(stub(encodeToolResult(null))).toContain("returned nothing.")
  expect(stub(encodeToolResult({ ok: true }))).toContain(
    "returned an object with 1 keys."
  )
  expect(stub("not json")).toContain(
    'returned a string of 8 characters starting: "not json".'
  )
})

test("a summary replaces everything before its boundary and heads the transcript", () => {
  const rows = transcript()
  const messages = compactTranscript(rows, {
    clearedAtTurn: 8,
    clearedBefore: 6,
    summary: { before: 8, content: "Task: rename it.", turn: 8 },
  })

  expect(messages).toHaveLength(1 + rows.filter((row) => row.order >= 8).length)
  expect(messages[0]).toEqual({
    content: expect.stringMatching(
      /^# Compacted history\n\n.*context window.*\n\nTask: rename it\.$/s
    ),
    role: "user",
  })
  expect(messages.slice(1)).toEqual(
    rows.filter((row) => row.order >= 8).map((row) => row.message)
  )
})
