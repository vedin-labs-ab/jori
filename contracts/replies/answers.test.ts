import { expect, test } from "vitest"
import { readChoicesAnswer, readMessageContext } from "./answers"

test("reads the resource a message was opened about", () => {
  expect(
    readMessageContext({ context: { kind: "table", id: "collections_1" } })
  ).toEqual({ kind: "table", id: "collections_1" })
})

test("a context of an unknown kind, or without an id, reads as none", () => {
  expect(readMessageContext({ context: { kind: "page", id: "x" } })).toBe(
    undefined
  )
  expect(readMessageContext({ context: { kind: "file", id: "" } })).toBe(
    undefined
  )
  expect(readMessageContext({})).toBe(undefined)
  expect(readMessageContext(null)).toBe(undefined)
})

test("reads which part a message answers, keeping the string values", () => {
  expect(
    readChoicesAnswer({
      answer: { messageId: "m1", part: 0, values: ["yes", 2, "no"] },
    })
  ).toEqual({ messageId: "m1", part: 0, values: ["yes", "no"] })
})

test("an answer needs a message, an integer part, and a values array", () => {
  expect(readChoicesAnswer({ answer: { messageId: "m1", part: 0 } })).toBe(
    undefined
  )
  expect(
    readChoicesAnswer({ answer: { messageId: "m1", part: 0, values: "yes" } })
  ).toBe(undefined)
  expect(
    readChoicesAnswer({ answer: { messageId: "m1", part: 0.5, values: [] } })
  ).toBe(undefined)
  expect(
    readChoicesAnswer({ answer: { messageId: 1, part: 0, values: [] } })
  ).toBe(undefined)
  expect(readChoicesAnswer({})).toBe(undefined)
})

test("an empty values array is an answer with nothing chosen", () => {
  expect(
    readChoicesAnswer({ answer: { messageId: "m1", part: 1, values: [] } })
  ).toEqual({ messageId: "m1", part: 1, values: [] })
})
