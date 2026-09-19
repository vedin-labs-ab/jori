import { expect, test } from "vitest"
import { excerpt } from "../../../contracts/discovery/excerpt"
import { pack, unpack } from "./cache"
import { chunks } from "./text"

test("long fields remain searchable and every chunk offset points to the original Unicode text", () => {
  const text = "Linnéa 🐈 invoice details. ".repeat(1500)
  const parts = chunks([
    { text, location: { kind: "row", id: "row", field: "notes" } },
  ])
  expect(parts.length).toBeGreaterThan(8)
  for (const part of parts) {
    expect(text.slice(part.location.start, part.location.end)).toBe(part.text)
    const cached = pack(part.text)
    expect(unpack(cached)).toBe(part.text)
    expect(cached).toBeInstanceOf(ArrayBuffer)
    expect((cached as ArrayBuffer).byteLength).toBeLessThan(
      new TextEncoder().encode(part.text).byteLength
    )
  }
  expect(parts.at(-1)?.location.end).toBe(text.length)
  expect(excerpt(text, "🐈").focus).toEqual({ start: 7, end: 9 })
})

test("inserting a paragraph reuses distant chunks without losing Unicode or source offsets", () => {
  const text = Array.from(
    { length: 800 },
    (_, i) =>
      `Operations note ${i}: The accounts team reconciles supplier invoice INV-${i} against purchase order PO-${i + 100}. Approvers review tax codes, payment terms, delivery confirmation, and the monthly budget. Unmatched invoices remain pending until the purchasing manager confirms receipt. Project ${i % 17} records EUR ${100 + ((i * 17) % 1900)} for department ${i % 9}.`
  ).join("\n\n")
  const section = (text: string) => [
    { text, location: { kind: "passage" as const, id: "0" } },
  ]
  const before = chunks(section(text)),
    after = chunks(section(`Added instructions.\n\n${text}`))
  const original = new Set(before.map((chunk) => chunk.text))
  expect(
    after.filter((chunk) => original.has(chunk.text)).length
  ).toBeGreaterThan(after.length * 0.8)
  for (const value of [
    "🐈".repeat(8000),
    "x🐈".repeat(5000),
    `${"A".repeat(3000)}\ud800${"B".repeat(3000)}`,
  ]) {
    const parts = chunks(section(value))
    let covered = 0
    for (const part of parts) {
      expect(part.location.start).toBeLessThanOrEqual(covered)
      expect(value.slice(part.location.start, part.location.end)).toBe(
        part.text
      )
      expect(unpack(pack(part.text))).toBe(part.text)
      covered = part.location.end ?? 0
    }
    expect(covered).toBe(value.length)
  }
})
