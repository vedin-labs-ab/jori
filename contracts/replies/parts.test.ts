import { expect, test } from "vitest"
import { replyPartKinds, replyPartLimits } from "./parts"
import { parseReplyParts, readReplyParts } from "./validate"

const reference = {
  kind: "reference",
  target: { kind: "table", id: "collections_1" },
}
const choices = {
  kind: "choices",
  options: [{ label: "Yes" }, { label: "No", value: "no" }],
}

test("reads references and choices in order", () => {
  expect(readReplyParts([reference, choices], replyPartKinds)).toEqual([
    reference,
    choices,
  ])
  expect(readReplyParts(undefined, replyPartKinds)).toEqual([])
  expect(readReplyParts(null, replyPartKinds)).toEqual([])
})

test("only the kinds a surface accepts are admitted", () => {
  expect(readReplyParts([reference], ["reference"])).toEqual([reference])
  expect(() => readReplyParts([choices], ["reference"])).toThrow(
    /parts.0: does not match any allowed shape/
  )
})

test.each([
  [
    "an unknown reference kind",
    { kind: "reference", target: { kind: "page", id: "x" } },
  ],
  [
    "an empty reference id",
    { kind: "reference", target: { kind: "file", id: "" } },
  ],
  ["an extra part field", { ...reference, extra: true }],
  [
    "an extra option field",
    { kind: "choices", options: [{ label: "Yes", icon: "check" }] },
  ],
  ["no options", { kind: "choices", options: [] }],
  [
    "too many options",
    {
      kind: "choices",
      options: Array.from(
        { length: replyPartLimits.options + 1 },
        (_, index) => ({
          label: `Option ${index}`,
        })
      ),
    },
  ],
  ["an empty option label", { kind: "choices", options: [{ label: "" }] }],
  [
    "an unsupported selection mode",
    { kind: "choices", options: [{ label: "Yes" }], select: "all" },
  ],
])("rejects %s", (_name, part) => {
  expect(() => readReplyParts([part], replyPartKinds)).toThrow(
    /parts\.0: does not match any allowed shape/
  )
})

test("a question and its options carry a subtitle each", () => {
  const question = {
    kind: "choices",
    prompt: "Where should the summary go?",
    description: "The channel the thread already lives in.",
    options: [
      { label: "#finance", description: "Where renewals are discussed." },
      { label: "Here" },
    ],
  }

  expect(readReplyParts([question], replyPartKinds)).toEqual([question])
})

test("a reply holds at most six references, five questions, and one row of chips", () => {
  const references = Array.from({ length: 7 }, () => reference)
  const questions = Array.from({ length: 6 }, (_, index) => ({
    ...choices,
    prompt: `Question ${index}`,
  }))

  // The schema caps the list at twelve, the sum of the three limits; the
  // split between kinds is checked after.
  expect(() =>
    readReplyParts([...references, ...questions], replyPartKinds)
  ).toThrow(/must contain at most/)
  expect(() => readReplyParts(references, replyPartKinds)).toThrow(
    /at most 6 references/
  )
  expect(() => readReplyParts(questions, replyPartKinds)).toThrow(
    /at most 5 questions/
  )
  expect(() => readReplyParts([choices, choices], replyPartKinds)).toThrow(
    /at most one choices part without a prompt/
  )
  expect(
    readReplyParts(
      [...references.slice(0, 6), ...questions.slice(0, 5), choices],
      replyPartKinds
    )
  ).toHaveLength(12)
})

test("stored parts that no longer validate read as nothing", () => {
  expect(parseReplyParts({ parts: [reference] })).toEqual([reference])
  expect(parseReplyParts({ parts: [{ kind: "reference" }] })).toEqual([])
  expect(parseReplyParts({})).toEqual([])
  expect(parseReplyParts("parts")).toEqual([])
})
