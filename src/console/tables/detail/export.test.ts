import { describe, expect, test } from "vitest"
import { type TableColumn } from "../types"
import { buildCsvExport } from "./export"

const columns: TableColumn[] = [
  { id: "title", name: "Title", type: "string", required: true },
  { id: "count", name: "Count", type: "integer" },
  { id: "done", name: "Done", type: "boolean" },
]

describe("buildCsvExport", () => {
  test("emits column names and values in definition order", () => {
    const csv = buildCsvExport(columns, [
      { values: { done: true, title: "Launch, then rest", count: 3 } },
      { values: { title: "Ship" } },
    ])

    expect(csv).toBe('Title,Count,Done\n"Launch, then rest",3,true\nShip,,\n')
  })
})
