import { expect, test } from "vitest"
import { readResult } from "./response"

function response(...values: object[]) {
  return [
    '{"partial":true}',
    ...values.map((value) => JSON.stringify(value)),
  ].join("\n")
}

test("interrupted speech retains finished segments with truthful coverage and timestamps", () => {
  const value = { text: "The invoice was paid", seconds: 87.2 }
  const result = readResult(response(value), "audio")
  expect(result.coverage).toBe("partial")
  expect(result.sections[0]).toMatchObject(value)
  expect(
    readResult(response(value, { complete: true }), "audio").coverage
  ).toBe("transcript")
})

test("OCR preserves page anchors and reports missed pages even with a completion marker", () => {
  const result = readResult(
    response(
      { text: "Readable", page: 2 },
      { text: "", page: 5, unavailable: true },
      { complete: true }
    ),
    "pdf"
  )
  expect(result.coverage).toBe("partial")
  expect(result.sections[0]).toMatchObject({ text: "Readable", page: 2 })
})

test("untrusted outputs cannot produce impossible navigation locations", () => {
  for (const value of [
    { text: "bad", seconds: -1 },
    { text: "bad", page: 0 },
    { text: "bad", seconds: "87" },
    { text: "bad", page: 1.5 },
  ]) {
    expect(() => readResult(response(value), "pdf")).toThrow(
      "Invalid extraction result"
    )
  }
  expect(() => readResult(response({ error: "encrypted" }), "pdf")).toThrow(
    "unlocked copy"
  )
})
