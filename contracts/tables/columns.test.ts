import { describe, expect, test } from "vitest"
import {
  assertColumnEvolution,
  newColumnId,
  normalizeTableColumns,
  readStoredColumns,
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

  test("generates a hidden id when a column comes without one", () => {
    const [column] = normalizeTableColumns([{ name: "Title", type: "string" }])

    expect(column?.id).toMatch(/^c_[0-9a-f]{32}$/)
    expect(column?.name).toBe("Title")
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
  test("mints distinct ids that pass normalization", () => {
    const first = newColumnId()
    const second = newColumnId()

    expect(first).not.toBe(second)
    expect(
      normalizeTableColumns([{ id: first, name: "Fine", type: "string" }])
    ).toHaveLength(1)
  })
})

describe("readStoredColumns", () => {
  test("reads a legacy key as the hidden id and drops the field", () => {
    expect(
      readStoredColumns([
        { key: "title", name: "Title", type: "string", required: true },
        { id: "c_1", name: "Count", type: "integer" },
      ])
    ).toEqual([
      { id: "title", name: "Title", type: "string", required: true },
      { id: "c_1", name: "Count", type: "integer" },
    ])
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
