import { expect, test } from "vitest"
import { createStreamingParser, parseMarkdown, settledLength } from "./parse"

const settled = (text: string) => text.slice(0, settledLength(text))
/** The tokens of a text lexed whole, as a plain list. */
const whole = (text: string) => [...parseMarkdown(text, true)]

test("a text is settled up to its last blank line that has a line after it", () => {
  expect(settled("# Title\n\nSome text.\n\nMore to")).toBe(
    "# Title\n\nSome text.\n\n"
  )
  expect(settled("Some text.\n\n")).toBe("")
  expect(settled("Some text.")).toBe("")
})

test("a fence is never cut, open or closed", () => {
  expect(settled("Intro\n\n```ts\nconst a = 1\n\nconst b = 2\n\nmore")).toBe(
    "Intro\n\n"
  )
  expect(settled("```ts\ncode\n\n```\n\nAfter")).toBe("```ts\ncode\n\n```\n\n")
  // A shorter or a different fence inside does not close it.
  expect(settled("````\n```\n\n~~~\n\nstill code")).toBe("")
})

test("a table is never cut", () => {
  expect(settled("Intro\n\n| a | b |\n| --- | --- |\n| 1 | 2 |")).toBe(
    "Intro\n\n"
  )
})

test("a list stays whole across its blank lines, with what is indented under its items", () => {
  expect(settled("- a\n\n- b\n\nEnd")).toBe("- a\n\n- b\n\n")
  expect(settled("1. a\n\n2. b\n\nEnd")).toBe("1. a\n\n2. b\n\n")
  expect(settled("- a\n\n  under a\n\nEnd")).toBe("- a\n\n  under a\n\n")
})

test("the streaming parser keeps the settled tokens and lexes the tail alone", () => {
  const parse = createStreamingParser()
  const first = parse("# Title\n\nFirst paragraph.\n\nSecond para")
  const second = parse(
    "# Title\n\nFirst paragraph.\n\nSecond paragraph.\n\n- a\n- b"
  )

  expect(second[0]).toBe(first[0])
  expect(second[2]).toBe(first[2])
  expect(second).toEqual(
    whole("# Title\n\nFirst paragraph.\n\nSecond paragraph.\n\n- a\n- b")
  )

  // The tail is completed the way a streaming text is.
  expect(parse("# Title\n\nFirst paragraph.\n\n| a | b |").at(-1)?.type).toBe(
    "table"
  )
  // A text that is not a continuation starts over.
  expect(parse("Another reply.")).toEqual(whole("Another reply."))
})
