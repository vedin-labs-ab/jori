import { expect, test } from "vitest"
import { nameMentions } from "./tokens"

test("names the tokens the references name, and leaves the rest", () => {
  const references = [
    { kind: "table", id: "t1", name: "Release checklist" },
    { kind: "file", id: "f1", name: null },
  ]

  expect(
    nameMentions(
      "Summarize +[table:t1] and +[file:f1] by +[job:j9]",
      references
    )
  ).toBe("Summarize Release checklist and +[file:f1] by +[job:j9]")
  expect(nameMentions("a+b and +[video:x]", references)).toBe(
    "a+b and +[video:x]"
  )
})
