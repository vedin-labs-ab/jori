import { describe, expect, test } from "vitest"
import { columnNames, deriveTableName, planCsvTable } from "./infer"

describe("columnNames", () => {
  test("keeps header cells verbatim, trimmed", () => {
    expect(
      columnNames(["First Name", "  Amount ($) ", "Éclair--count"])
    ).toEqual(["First Name", "Amount ($)", "Éclair--count"])
  })

  test("names blank cells by position", () => {
    expect(columnNames(["", "b", "  "])).toEqual(["Column 1", "b", "Column 3"])
  })

  test("dedupes colliding names deterministically, ignoring case", () => {
    expect(columnNames(["Name", "name", "NAME"])).toEqual([
      "Name",
      "name 2",
      "NAME 3",
    ])
  })
})

describe("deriveTableName", () => {
  test("cleans the file name into a table name", () => {
    expect(deriveTableName("q4-sales_report.csv")).toBe("Q4 sales report")
    expect(deriveTableName("Customers.CSV")).toBe("Customers")
    expect(deriveTableName("weekly stats.csv")).toBe("Weekly stats")
  })

  test("falls back when nothing usable remains", () => {
    expect(deriveTableName(".csv")).toBe("Imported table")
    expect(deriveTableName("---.csv")).toBe("Imported table")
  })
})

describe("planCsvTable columns", () => {
  test("keeps original headers as names over generated hidden ids", () => {
    const plan = planCsvTable("First Name,,2024\nAda,x,1\n")

    expect(plan.status === "ready" && plan.columns).toEqual([
      { id: "c1", name: "First Name", type: "string", required: true },
      { id: "c2", name: "Column 2", type: "string", required: true },
      { id: "c3", name: "2024", type: "integer", required: true },
    ])
  })

  test("infers integer, float, boolean, and text columns", () => {
    const plan = planCsvTable(
      "count,price,done,note\n3,1.5,true,hey\n-7,2,FALSE,4u\n"
    )

    expect(
      plan.status === "ready" && plan.columns.map((column) => column.type)
    ).toEqual(["integer", "float", "boolean", "string"])
  })

  test("mixed numeric and text columns fall back to text", () => {
    const plan = planCsvTable("value\n3\nmany\n")

    expect(plan.status === "ready" && plan.columns).toEqual([
      { id: "c1", name: "value", type: "string", required: true },
    ])
  })
})

describe("planCsvTable required flags", () => {
  test("empty cells keep inference working and make columns optional", () => {
    const plan = planCsvTable("count,name\n3,Ada\n,Grace\n5,\n")

    expect(plan.status === "ready" && plan.columns).toEqual([
      { id: "c1", name: "count", type: "integer" },
      { id: "c2", name: "name", type: "string" },
    ])
  })

  test("short records count as empty cells for the missing columns", () => {
    const plan = planCsvTable("a,b\n1,2\n3\n")

    expect(plan.status === "ready" && plan.columns).toEqual([
      { id: "c1", name: "a", type: "integer", required: true },
      { id: "c2", name: "b", type: "integer" },
    ])
  })

  test("an all-empty column becomes optional text", () => {
    const plan = planCsvTable("a,b\n1,\n2,\n")

    expect(plan.status === "ready" && plan.columns[1]).toEqual({
      id: "c2",
      name: "b",
      type: "string",
    })
  })
})

describe("planCsvTable rows", () => {
  test("coerces rows to the deduced types and skips blank records", () => {
    const plan = planCsvTable("count,done,note\n3,True,hi\n\n , ,\n,false,\n")

    expect(plan).toEqual({
      status: "ready",
      columns: [
        { id: "c1", name: "count", type: "integer" },
        { id: "c2", name: "done", type: "boolean", required: true },
        { id: "c3", name: "note", type: "string" },
      ],
      rows: [
        { line: 2, values: { c1: 3, c2: true, c3: "hi" } },
        { line: 5, values: { c2: false } },
      ],
    })
  })

  test("reports records wider than the header with file line numbers", () => {
    const plan = planCsvTable("a\n1\n2,extra\n")

    expect(plan).toMatchObject({
      status: "invalid",
      total: 2,
      issues: [{ line: 3, message: "Has 2 fields where the header has 1." }],
    })
  })
})

describe("planCsvTable errors", () => {
  test("rejects empty and data-free files", () => {
    expect(planCsvTable("")).toMatchObject({
      status: "error",
      message: "The file is empty.",
    })
    expect(planCsvTable("a,b\n")).toMatchObject({
      status: "error",
      message: "The file has no data rows.",
    })
  })

  test("rejects files with more columns than tables allow", () => {
    const header = Array.from({ length: 65 }, (_, i) => `c${i}`).join(",")

    expect(planCsvTable(`${header}\n1\n`)).toMatchObject({ status: "error" })
  })
})
