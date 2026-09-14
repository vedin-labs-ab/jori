import { expect, test } from "vitest"
import { nameMentions } from "./tokens"

const references = [
  { kind: "table", id: "t1", name: "Release checklist" },
  { kind: "file", id: "f1", name: null },
]

test("names the tokens the references name, and leaves the rest", () => {
  expect(
    nameMentions(
      "Summarize +[table:t1] and +[file:f1] by +[job:j9]",
      references
    )
  ).toBe("Summarize Release checklist and +[file:f1] by +[job:j9]")
  expect(nameMentions("a+b and +[video:x]", references)).toBe(
    "a+b and +[video:x]"
  )
  expect(nameMentions("+[TABLE:t1]\n+[table:t1]", references)).toBe(
    "Release checklist\nRelease checklist"
  )
})

test("reads only the tokens the composer would have made mentions of", () => {
  const dotted = [{ kind: "table", id: "t.1", name: "Dotted" }]

  // No boundary before the `+`, so it is prose, not a mention.
  expect(nameMentions("see+[table:t1] and x+[table:t1]", references)).toBe(
    "see+[table:t1] and x+[table:t1]"
  )
  // An id of another shape is no token at all.
  expect(nameMentions("see +[table:t.1] +[table:]", dotted)).toBe(
    "see +[table:t.1] +[table:]"
  )
})
