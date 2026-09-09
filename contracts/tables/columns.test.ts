import { describe, expect, test } from "vitest"
import {
  assertColumnEvolution,
  newColumnId,
  normalizeTableColumns,
} from "./columns"

describe("normalizeTableColumns", () => {
  test("normalizes names and flags, keeping given ids", () => {
    expect(
      normalizeTableColumns([
        { id: "title", name: " Title ", type: "string", required: true },
        { id: "count", name: "Count", type: "integer" },
        { id: "score", name: "Score", type: "float" },
      ])
    ).toEqual([
      { id: "title", name: "Title", type: "string", required: true },
      { id: "count", name: "Count", type: "integer" },
      { id: "score", name: "Score", type: "float" },
    ])
  })

  test("allows a table with no columns at all", () => {
    expect(normalizeTableColumns([])).toEqual([])
  })

  test("rejects missing names and duplicate names, ignoring case", () => {
    expect(() =>
      normalizeTableColumns([{ name: "  ", type: "string" }])
    ).toThrow("Every column needs a name.")
    expect(() =>
      normalizeTableColumns([
        { name: "Title", type: "string" },
        { name: " title ", type: "float" },
      ])
    ).toThrow('A column named "title" already exists.')
  })

  test("rejects duplicate and malformed ids", () => {
    expect(() =>
      normalizeTableColumns([
        { id: "twice", name: "One", type: "string" },
        { id: "twice", name: "Two", type: "string" },
      ])
    ).toThrow("Duplicate table column id")
    expect(() =>
      normalizeTableColumns([{ id: "9bad", name: "Bad", type: "string" }])
    ).toThrow("Column ids are internal")
  })

  test("rejects unknown types", () => {
    expect(() =>
      normalizeTableColumns([{ name: "When", type: "date" }])
    ).toThrow("must use one of")
    expect(() =>
      normalizeTableColumns([{ name: "Meta", type: "json" }])
    ).toThrow("must use one of")
  })
})

describe("newColumnId", () => {
  test("generated ids are distinct and survive normalization", () => {
    const first = newColumnId()
    const columns = normalizeTableColumns([
      { id: first, name: "Title", type: "string" },
      { name: "Count", type: "integer" },
    ])

    expect(columns[0]?.id).toBe(first)
    expect(columns[1]?.id).toEqual(expect.any(String))
    expect(columns[1]?.id).not.toBe(first)
    expect(normalizeTableColumns(columns)).toEqual(columns)
  })
})

describe("assertColumnEvolution", () => {
  const current = normalizeTableColumns([
    { id: "title", name: "Title", type: "string", required: true },
  ])

  test("allows renames, required toggles, additions, and removals", () => {
    expect(() =>
      assertColumnEvolution(
        current,
        normalizeTableColumns([
          { id: "title", name: "Name", type: "string" },
          { id: "status", name: "Status", type: "string" },
        ])
      )
    ).not.toThrow()
    expect(() => assertColumnEvolution(current, [])).not.toThrow()
  })

  test("rejects retyping an existing column", () => {
    expect(() =>
      assertColumnEvolution(
        current,
        normalizeTableColumns([
          { id: "title", name: "Title", type: "float", required: true },
        ])
      )
    ).toThrow("keeps its string type")
  })
})
