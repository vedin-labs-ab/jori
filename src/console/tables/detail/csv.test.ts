import { describe, expect, test } from "vitest"
import { type TableColumn } from "../types"
import { buildCsvExport, planCsvImport } from "./csv"

const columns: TableColumn[] = [
  { key: "title", name: "Title", type: "string", required: true },
  { key: "count", name: "Count", type: "integer" },
  { key: "done", name: "Done", type: "boolean" },
]

describe("planCsvImport", () => {
  test("maps headers by key or name, case-insensitively", () => {
    const plan = planCsvImport(
      columns,
      "TITLE,Count,done\nLaunch,3,true\nShip,,false\n"
    )

    expect(plan).toEqual({
      status: "ready",
      rows: [
        { title: "Launch", count: 3, done: true },
        { title: "Ship", done: false },
      ],
    })
  })

  test("skips blank records instead of importing empty rows", () => {
    const plan = planCsvImport(columns, "title\nLaunch\n\n , \n")

    expect(plan).toEqual({ status: "ready", rows: [{ title: "Launch" }] })
  })

  test("reports unmatched header cells", () => {
    const plan = planCsvImport(columns, "title,owner\nLaunch,me\n")

    expect(plan).toMatchObject({ status: "error" })
    expect(plan.status === "error" && plan.message).toContain("owner")
  })

  test("reports missing required columns and duplicate headers", () => {
    expect(planCsvImport(columns, "count\n3\n")).toMatchObject({
      status: "error",
      message: "The header is missing required column: title.",
    })
    expect(planCsvImport(columns, "title,Title\na,b\n")).toMatchObject({
      status: "error",
      message: 'Column "title" appears more than once in the header.',
    })
  })

  test("collects per-row issues with file line numbers", () => {
    const plan = planCsvImport(
      columns,
      "title,count\nLaunch,3\n,4\nShip,many\n"
    )

    expect(plan).toEqual({
      status: "invalid",
      total: 3,
      issues: [
        { line: 3, message: "title: Title is required." },
        { line: 4, message: "count: Enter a number." },
      ],
    })
  })

  test("rejects rows wider than the header and empty files", () => {
    expect(planCsvImport(columns, "title\nLaunch,extra\n")).toMatchObject({
      status: "invalid",
    })
    expect(planCsvImport(columns, "")).toMatchObject({ status: "error" })
    expect(planCsvImport(columns, "title\n")).toMatchObject({
      status: "error",
      message: "The file has no data rows.",
    })
  })
})

describe("buildCsvExport", () => {
  test("emits column keys and values in definition order", () => {
    const csv = buildCsvExport(columns, [
      { values: { done: true, title: "Launch, then rest", count: 3 } },
      { values: { title: "Ship" } },
    ])

    expect(csv).toBe('title,count,done\n"Launch, then rest",3,true\nShip,,\n')
  })
})
