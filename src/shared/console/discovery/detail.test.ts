import { type Hit } from "@contracts/discovery"
import { expect, test } from "vitest"
import { resultDetail } from "./detail"

function hit(overrides: Partial<Hit> = {}): Hit {
  return {
    kind: "file",
    resourceId: "file",
    title: "Questionnaire.md",
    resourceName: "Questionnaire.md",
    candidate: { key: "files:file", revision: "1", part: 0, score: 1 },
    snippet: "…**Who can read customer data?**…",
    location: { kind: "passage", id: "1" },
    ...overrides,
  }
}

test("prose decoration is removed while source text and locations remain unchanged", () => {
  const source = hit()
  expect(resultDetail(source, "customer")).toBe("…Who can read customer data?…")
  expect(source.snippet).toContain("**Who")
  expect(
    resultDetail(hit({ resourceName: "formula.py", snippet: "x**2**3" }), "x")
  ).toBe("formula.py · x**2**3")
})

test("name matches do not dump table schemas or repeat resource names", () => {
  expect(
    resultDetail(
      hit({
        kind: "table",
        title: "Customers",
        resourceName: "Customers",
        snippet: "Customers Account Plan Seats MRR",
        location: { kind: "resource", id: "table" },
      }),
      "customer"
    )
  ).toBe("")
})

test("rows show their table and matched column, without repeating the row name", () => {
  const row = hit({
    kind: "table",
    title: "Northwind",
    resourceName: "Customer accounts",
    snippet: "Plan: Enterprise",
    location: { kind: "row", id: "row" },
  })
  expect(resultDetail(row, "enterprise")).toBe(
    "Customer accounts · Plan: Enterprise"
  )
  expect(resultDetail({ ...row, snippet: "Northwind" }, "northwind")).toBe(
    "Customer accounts"
  )
})

test("file locations and extraction limitations use compact, meaningful context", () => {
  expect(
    resultDetail(
      hit({
        coverage: "partial",
        location: { kind: "passage", id: "1", page: 2 },
      }),
      "customer"
    )
  ).toBe("Partial text, Page 2 · …Who can read customer data?…")
  expect(
    resultDetail(
      hit({
        coverage: "transcript",
        location: { kind: "passage", id: "1", seconds: 134.4 },
      }),
      "customer"
    )
  ).toBe("Transcript, 2:14 · …Who can read customer data?…")
})

test("title-only run matches hide unrelated payloads but content matches retain their evidence", () => {
  const run = hit({
    kind: "run",
    title: "Summarize customers",
    resourceName: "Summarize customers",
    snippet: "List Table Rows Result: array Result size: 5",
    location: { kind: "activity", id: "trace" },
  })
  expect(resultDetail(run, "customer")).toBe("")
  expect(resultDetail(run, "array")).toContain("Result: array")
})

test("a matched column name explains table results without an inventory of columns", () => {
  expect(
    resultDetail(
      hit({
        kind: "table",
        title: "Support escalations",
        resourceName: "Support escalations",
        snippet: "…Customer…",
        location: { kind: "resource", id: "table", start: 20, end: 28 },
      }),
      "customer"
    )
  ).toBe("Column: Customer")
  expect(
    resultDetail(
      hit({
        kind: "store",
        title: "New store",
        resourceName: "New store",
        snippet: "New store…",
        location: { kind: "resource", id: "store" },
      }),
      "customer"
    )
  ).toBe("")
})
