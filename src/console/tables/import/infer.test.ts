import { describe, expect, test } from "vitest"
import { deriveTableName, planCsvTable, slugColumnKey } from "./infer"

describe("slugColumnKey", () => {
  test("slugs header cells into contracts-safe keys", () => {
    expect(slugColumnKey("First Name")).toBe("first_name")
    expect(slugColumnKey("  Amount ($) ")).toBe("amount")
    expect(slugColumnKey("Éclair--count")).toBe("clair_count")
  })

  test("forces keys to start with a letter", () => {
    expect(slugColumnKey("2024 Sales")).toBe("c_2024_sales")
    expect(slugColumnKey("_hidden")).toBe("hidden")
    expect(slugColumnKey("")).toBe("column")
    expect(slugColumnKey("!!!")).toBe("column")
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
  test("dedupes colliding keys deterministically", () => {
    const plan = planCsvTable("Name,name,NAME\na,b,c\n")

    expect(plan.status === "ready" && plan.columns.map((c) => c.key)).toEqual([
      "name",
      "name_2",
      "name_3",
    ])
  })

  test("keeps original headers as display names", () => {
    const plan = planCsvTable("First Name,,2024\nAda,x,1\n")

    expect(plan.status === "ready" && plan.columns).toEqual([
      { key: "first_name", name: "First Name", type: "string", required: true },
      { key: "column", name: "column", type: "string", required: true },
      { key: "c_2024", name: "2024", type: "integer", required: true },
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
      { key: "value", name: "value", type: "string", required: true },
    ])
  })
})

describe("planCsvTable required flags", () => {
  test("empty cells keep inference working and make columns optional", () => {
    const plan = planCsvTable("count,name\n3,Ada\n,Grace\n5,\n")

    expect(plan.status === "ready" && plan.columns).toEqual([
      { key: "count", name: "count", type: "integer" },
      { key: "name", name: "name", type: "string" },
    ])
  })

  test("short records count as empty cells for the missing columns", () => {
    const plan = planCsvTable("a,b\n1,2\n3\n")

    expect(plan.status === "ready" && plan.columns).toEqual([
      { key: "a", name: "a", type: "integer", required: true },
      { key: "b", name: "b", type: "integer" },
    ])
  })

  test("an all-empty column becomes optional text", () => {
    const plan = planCsvTable("a,b\n1,\n2,\n")

    expect(plan.status === "ready" && plan.columns[1]).toEqual({
      key: "b",
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
        { key: "count", name: "count", type: "integer" },
        { key: "done", name: "done", type: "boolean", required: true },
        { key: "note", name: "note", type: "string" },
      ],
      rows: [
        { line: 2, values: { count: 3, done: true, note: "hi" } },
        { line: 5, values: { done: false } },
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
