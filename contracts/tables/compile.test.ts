import { describe, expect, test } from "vitest"
import { validateJsonSchemaValue } from "../schema/validate"
import { type TableColumn } from "./columns"
import { compileTableSchema } from "./compile"

const columns: TableColumn[] = [
  { id: "title", name: "Headline", type: "string", required: true },
  { id: "count", name: "Count", type: "integer" },
  { id: "score", name: "Score", type: "float" },
  { id: "done", name: "Done", type: "boolean" },
]

const schema = compileTableSchema(columns)

function issues(values: unknown) {
  return validateJsonSchemaValue(schema, values, "Row").map(
    (issue) => `${issue.path}: ${issue.message}`
  )
}

describe("compiled row validation", () => {
  test("accepts every column type keyed by hidden id, not display name", () => {
    expect(
      issues({ title: "Launch", count: 3, score: 0.5, done: false })
    ).toEqual([])
  })

  test("accepts an empty row when every column is optional", () => {
    const optionalSchema = compileTableSchema([
      { id: "note", name: "Note", type: "string" },
    ])

    expect(validateJsonSchemaValue(optionalSchema, {}, "Row")).toEqual([])
    expect(
      validateJsonSchemaValue(optionalSchema, { note: "Draft" }, "Row")
    ).toEqual([])
    expect(
      validateJsonSchemaValue(optionalSchema, { note: 1, extra: true }, "Row")
    ).toEqual([
      { path: "Row.note", message: "must be string" },
      { path: "Row.extra", message: "is not allowed" },
    ])
  })

  test("requires required columns and rejects unknown keys", () => {
    expect(issues({ count: 1 })).toEqual(["Row.title: is required"])
    expect(issues({ title: "x", extra: true })).toEqual([
      "Row.extra: is not allowed",
    ])
  })

  test("rejects mistyped values per column type", () => {
    expect(issues({ title: "x", count: 1.5 })).toEqual([
      "Row.count: must be integer",
    ])
    expect(issues({ title: "x", score: "high" })).toEqual([
      "Row.score: must be number",
    ])
    expect(issues({ title: "x", done: "yes" })).toEqual([
      "Row.done: must be boolean",
    ])
    expect(issues({ title: 4 })).toEqual(["Row.title: must be string"])
    expect(issues("not a row")).toEqual(["Row: must be object"])
  })

  test("rejects stored nulls: an absent column is the one empty state", () => {
    expect(issues({ title: "x", count: null })).toEqual([
      "Row.count: must be integer",
    ])
  })
})
