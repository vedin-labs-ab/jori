import { describe, expect, test } from "vitest"
import { type TableColumn } from "./columns"
import { nameRowValues, resolveNamedValues } from "./names"

const columns: TableColumn[] = [
  { id: "c_1", name: "Title", type: "string", required: true },
  { id: "c_2", name: "Count", type: "integer" },
]

describe("resolveNamedValues", () => {
  test("translates name-keyed values to the hidden id keys", () => {
    expect(resolveNamedValues(columns, { Title: "Launch", Count: 3 })).toEqual({
      c_1: "Launch",
      c_2: 3,
    })
  })

  test("matches names forgivingly — trimmed, ignoring case", () => {
    expect(resolveNamedValues(columns, { " title ": "x" })).toEqual({
      c_1: "x",
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
  test("labels stored values by column name in column order", () => {
    expect(nameRowValues(columns, { c_2: 3, c_1: "Launch" })).toEqual({
      Title: "Launch",
      Count: 3,
    })
  })

  test("hides values of columns that no longer exist", () => {
    expect(nameRowValues(columns, { c_1: "Launch", gone: true })).toEqual({
      Title: "Launch",
    })
  })
})
