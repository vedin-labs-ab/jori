import { expect, test } from "vitest"
import { type TableColumn } from "../types"
import {
  buildRowValues,
  displayCellText,
  formatCellText,
  parseCellText,
} from "./cells"

test("parses text cells verbatim", () => {
  expect(parseCellText(column("string"), "hello")).toEqual({
    ok: true,
    value: "hello",
  })
})

test("clears an optional cell on empty input", () => {
  expect(parseCellText(column("string"), "  ")).toEqual({
    ok: true,
    value: undefined,
  })
})

test("rejects clearing a required cell", () => {
  const parsed = parseCellText(column("string", { required: true }), "")

  expect(parsed.ok).toBe(false)
})

test("parses numbers and rejects non-numeric text", () => {
  expect(parseCellText(column("number"), "1.5")).toEqual({
    ok: true,
    value: 1.5,
  })
  expect(parseCellText(column("number"), "abc").ok).toBe(false)
})

test("integers reject fractions", () => {
  expect(parseCellText(column("integer"), "4")).toEqual({ ok: true, value: 4 })
  expect(parseCellText(column("integer"), "4.2").ok).toBe(false)
})

test("booleans accept only true and false", () => {
  expect(parseCellText(column("boolean"), "true")).toEqual({
    ok: true,
    value: true,
  })
  expect(parseCellText(column("boolean"), "yes").ok).toBe(false)
})

test("json cells parse structures and reject null and invalid text", () => {
  expect(parseCellText(column("json"), '{"a":1}')).toEqual({
    ok: true,
    value: { a: 1 },
  })
  expect(parseCellText(column("json"), "null").ok).toBe(false)
  expect(parseCellText(column("json"), "{oops").ok).toBe(false)
})

test("formats cell text so an edit round-trips", () => {
  const jsonColumn = column("json")
  const parsed = parseCellText(
    jsonColumn,
    formatCellText(jsonColumn, { a: [1, 2] })
  )

  expect(parsed).toEqual({ ok: true, value: { a: [1, 2] } })
  expect(formatCellText(column("number"), 3)).toBe("3")
  expect(formatCellText(column("string"), undefined)).toBe("")
})

test("displays compact json and an empty marker for cleared cells", () => {
  expect(displayCellText(column("json"), { a: 1 })).toBe('{"a":1}')
  expect(displayCellText(column("string"), undefined)).toBe("")
})

test("builds insert values, skipping empty optional columns", () => {
  const columns = [
    column("string", { key: "title", required: true }),
    column("integer", { key: "count" }),
    column("boolean", { key: "done" }),
  ]
  const built = buildRowValues(columns, {
    title: "Task",
    count: "",
    done: true,
  })

  expect(built).toEqual({
    ok: true,
    values: { title: "Task", done: true },
  })
})

test("build failures name the offending column", () => {
  const built = buildRowValues([column("integer", { key: "count" })], {
    count: "nope",
  })

  expect(built.ok).toBe(false)

  if (!built.ok) {
    expect(built.error).toContain("count")
  }
})

function column(
  type: TableColumn["type"],
  overrides: Partial<TableColumn> = {}
): TableColumn {
  return {
    key: overrides.key ?? "field",
    name: overrides.key ?? "field",
    type,
    ...overrides,
  }
}
