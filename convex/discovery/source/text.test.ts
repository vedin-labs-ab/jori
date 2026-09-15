import { expect, test } from "vitest"
import { chunks, excerpt } from "./text"

test("long fields remain searchable and every chunk offset points to the original Unicode text", () => {
  const text = "Linnéa 🐈 invoice details. ".repeat(1500)
  const parts = chunks([
    { text, location: { kind: "row", id: "row", field: "notes" } },
  ])
  expect(parts.length).toBeGreaterThan(8)
  for (const part of parts) {
    expect(text.slice(part.location.start, part.location.end)).toBe(part.text)
  }
  expect(parts.at(-1)?.location.end).toBe(text.length)
  expect(excerpt(text, "🐈").focus).toEqual({ start: 7, end: 9 })
})
