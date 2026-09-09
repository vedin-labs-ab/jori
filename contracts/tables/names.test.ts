import { describe, expect, test } from "vitest"
import { type TableColumn } from "./columns"
import { nameRowValues, resolveNamedValues } from "./names"

const columns: TableColumn[] = [
  { id: "c_1", name: "Title", type: "string", required: true },
  { id: "c_2", name: "Count", type: "integer" },
]

describe("resolveNamedValues", () => {
  test("resolves column names ignoring case and whitespace, preserving values", () => {
    expect(
      resolveNamedValues(columns, { " title ": "Launch", Count: 3 })
    ).toEqual({
      c_1: "Launch",
      c_2: 3,
    })
  })

  test("passes null through so updates can clear a column", () => {
    expect(resolveNamedValues(columns, { Count: null })).toEqual({
      c_2: null,
    })
  })

  test("an unknown name errors with the table's actual columns", () => {
    expect(() => resolveNamedValues(columns, { Status: "open" })).toThrow(
      'Unknown column "Status". Columns: Title, Count.'
    )
    expect(() => resolveNamedValues([], { Status: "open" })).toThrow(
      "the table has no columns yet"
    )
  })

  test("rejects values that are not an object", () => {
    expect(() => resolveNamedValues(columns, "Launch")).toThrow(
      "keyed by column name"
    )
  })
})

describe("nameRowValues", () => {
  test("labels stored values by column name and hides deleted columns", () => {
    expect(
      nameRowValues(columns, { c_2: 3, gone: true, c_1: "Launch" })
    ).toEqual({
      Title: "Launch",
      Count: 3,
    })
    expect(nameRowValues(columns, { c_1: "Launch" })).toEqual({
      Title: "Launch",
    })
  })
})
