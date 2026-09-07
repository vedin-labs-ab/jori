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

test("reads which reply a message answers and each part's values, keeping the strings", () => {
  expect(
    readChoicesAnswer({
      answer: {
        messageId: "m1",
        answers: [
          { part: 0, values: ["yes", 2, "no"] },
          { part: 2, values: [] },
        ],
      },
    })
  ).toEqual({
    messageId: "m1",
    answers: [
      { part: 0, values: ["yes", "no"] },
      { part: 2, values: [] },
    ],
  })
})

test("an answer needs a message and an answers array", () => {
  expect(readChoicesAnswer({ answer: { messageId: "m1" } })).toBe(undefined)
  expect(readChoicesAnswer({ answer: { messageId: "m1", answers: {} } })).toBe(
    undefined
  )
  expect(readChoicesAnswer({ answer: { messageId: 1, answers: [] } })).toBe(
    undefined
  )
  expect(readChoicesAnswer({})).toBe(undefined)
})

test("an entry without an integer part and a values array is left out", () => {
  expect(
    readChoicesAnswer({
      answer: {
        messageId: "m1",
        answers: [
          { part: 0 },
          { part: 0.5, values: [] },
          { part: 1, values: "yes" },
          "one",
          { part: 1, values: ["yes"] },
        ],
      },
    })
  ).toEqual({ messageId: "m1", answers: [{ part: 1, values: ["yes"] }] })
})

test("an empty values array is an answer with nothing chosen", () => {
  expect(
    readChoicesAnswer({
      answer: { messageId: "m1", answers: [{ part: 1, values: [] }] },
    })
  ).toEqual({ messageId: "m1", answers: [{ part: 1, values: [] }] })
})
