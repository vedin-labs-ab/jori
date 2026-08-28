import { describe, expect, test } from "vitest"
import { type TableColumn } from "../types"
import { buildCsvExport } from "./export"

const columns: TableColumn[] = [
  { key: "title", name: "Title", type: "string", required: true },
  { key: "count", name: "Count", type: "integer" },
  { key: "done", name: "Done", type: "boolean" },
]

describe("buildCsvExport", () => {
  test("emits column keys and values in definition order", () => {
    const csv = buildCsvExport(columns, [
      { values: { done: true, title: "Launch, then rest", count: 3 } },
      { values: { title: "Ship" } },
    ])

    expect(csv).toBe('title,count,done\n"Launch, then rest",3,true\nShip,,\n')
  })
})
