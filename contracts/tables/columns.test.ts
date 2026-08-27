import { describe, expect, test } from "vitest"
import { assertColumnEvolution, normalizeTableColumns } from "./columns"

describe("normalizeTableColumns", () => {
  test("normalizes keys, names, and flags", () => {
    expect(
      normalizeTableColumns([
        { key: "title", name: " Title ", type: "string", required: true },
        { key: "count", type: "integer" },
        { key: "meta", type: "json", schema: { type: "array" } },
      ])
    ).toEqual([
      { key: "title", name: "Title", type: "string", required: true },
      { key: "count", name: "count", type: "integer" },
      { key: "meta", name: "meta", type: "json", schema: { type: "array" } },
    ])
  })

  test("rejects empty column lists, bad keys, and duplicates", () => {
    expect(() => normalizeTableColumns([])).toThrow("non-empty")
    expect(() =>
      normalizeTableColumns([{ key: "1bad", type: "string" }])
    ).toThrow("Column keys")
    expect(() =>
      normalizeTableColumns([
        { key: "title", type: "string" },
        { key: "title", type: "number" },
      ])
    ).toThrow("Duplicate table column key")
  })

  test("rejects unknown types and schemas on non-json columns", () => {
    expect(() =>
      normalizeTableColumns([{ key: "when", type: "date" }])
    ).toThrow("must use one of")
    expect(() =>
      normalizeTableColumns([
        { key: "title", type: "string", schema: { type: "string" } },
      ])
    ).toThrow("not a json column")
  })
})

describe("assertColumnEvolution", () => {
  const current = normalizeTableColumns([
    { key: "title", name: "Title", type: "string", required: true },
  ])

  test("allows appending optional columns and renaming displays", () => {
    expect(() =>
      assertColumnEvolution(
        current,
        normalizeTableColumns([
          { key: "title", name: "Name", type: "string", required: true },
          { key: "status", type: "string" },
        ])
      )
    ).not.toThrow()
  })

  test("rejects removing or retyping existing columns", () => {
    expect(() =>
      assertColumnEvolution(
        current,
        normalizeTableColumns([{ key: "status", type: "string" }])
      )
    ).toThrow("cannot be removed")
    expect(() =>
      assertColumnEvolution(
        current,
        normalizeTableColumns([
          { key: "title", name: "Title", type: "number", required: true },
        ])
      )
    ).toThrow("only change its display name")
  })

  test("rejects new required columns", () => {
    expect(() =>
      assertColumnEvolution(
        current,
        normalizeTableColumns([
          { key: "title", name: "Title", type: "string", required: true },
          { key: "status", type: "string", required: true },
        ])
      )
    ).toThrow("must be optional")
  })
})
