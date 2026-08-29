import { expect, test } from "vitest"
import { displayCellText } from "@/shared/materials/cells"
import { type TableColumn } from "../types"
import { buildRowValues, formatCellText, parseCellText } from "./cells"

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

test("parses floats and rejects non-numeric text", () => {
  expect(parseCellText(column("float"), "1.5")).toEqual({
    ok: true,
    value: 1.5,
  })
  expect(parseCellText(column("float"), "abc").ok).toBe(false)
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

test("formats cell text so an edit round-trips", () => {
  expect(formatCellText(column("float"), 3)).toBe("3")
  expect(formatCellText(column("string"), undefined)).toBe("")
})

test("displays an empty marker for cleared cells", () => {
  expect(displayCellText(false)).toBe("false")
  expect(displayCellText(undefined)).toBe("")
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

// A blank draft is how "New row" decides between instant creation and the
// add-row dialog: it creates instantly only when the blank row validates.

test("a blank draft passes without required columns, defaulting booleans", () => {
  const built = buildRowValues(
    [column("string", { key: "title" }), column("boolean", { key: "done" })],
    {}
  )

  expect(built).toEqual({ ok: true, values: { done: false } })
})

test("a blank draft fails against a required text-like column", () => {
  const built = buildRowValues(
    [column("string", { key: "title", required: true })],
    {}
  )

  expect(built.ok).toBe(false)
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
