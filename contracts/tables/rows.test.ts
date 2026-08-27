import { describe, expect, test } from "vitest"
import { normalizeTableColumns } from "./columns"
import { applyRowPatch, assertRowValues } from "./rows"

const columns = normalizeTableColumns([
  { key: "title", type: "string", required: true },
  { key: "count", type: "integer" },
  { key: "score", type: "number" },
  { key: "done", type: "boolean" },
  {
    key: "meta",
    type: "json",
    schema: { type: "object", required: ["source"], properties: {} },
  },
])

describe("assertRowValues", () => {
  test("accepts a row matching every column type", () => {
    expect(() =>
      assertRowValues({
        columns,
        values: {
          title: "Launch",
          count: 3,
          score: 0.5,
          done: false,
          meta: { source: "slack" },
        },
        label: "Row",
      })
    ).not.toThrow()
  })

  test("requires required columns and rejects unknown keys", () => {
    expect(() =>
      assertRowValues({ columns, values: { count: 1 }, label: "Row" })
    ).toThrow("title is required")
    expect(() =>
      assertRowValues({
        columns,
        values: { title: "x", extra: true },
        label: "Row",
      })
    ).toThrow("extra is not a column")
  })

  test("rejects mistyped values per column type", () => {
    expect(() =>
      assertRowValues({
        columns,
        values: { title: "x", count: 1.5 },
        label: "Row",
      })
    ).toThrow("count must be an integer")
    expect(() =>
      assertRowValues({
        columns,
        values: { title: "x", score: "high" },
        label: "Row",
      })
    ).toThrow("score must be a number")
    expect(() =>
      assertRowValues({
        columns,
        values: { title: "x", done: "yes" },
        label: "Row",
      })
    ).toThrow("done must be a boolean")
    expect(() =>
      assertRowValues({ columns, values: { title: 4 }, label: "Row" })
    ).toThrow("title must be a string")
  })
})

describe("assertRowValues json and null handling", () => {
  test("validates json columns against their schema", () => {
    expect(() =>
      assertRowValues({
        columns,
        values: { title: "x", meta: {} },
        label: "Row",
      })
    ).toThrow("meta.source is required")
  })

  test("rejects stored nulls", () => {
    expect(() =>
      assertRowValues({
        columns,
        values: { title: "x", count: null },
        label: "Row",
      })
    ).toThrow("cannot be null")
  })
})

describe("applyRowPatch", () => {
  test("replaces patched columns and clears nulled ones", () => {
    expect(
      applyRowPatch({ title: "Launch", count: 3 }, { count: null, done: true })
    ).toEqual({ title: "Launch", done: true })
  })

  test("clearing a required column fails validation afterwards", () => {
    const values = applyRowPatch({ title: "Launch" }, { title: null })

    expect(() => assertRowValues({ columns, values, label: "Row" })).toThrow(
      "title is required"
    )
  })
})
