import { describe, expect, test } from "vitest"
import {
  assertJsonSchemaValue,
  validateJsonSchemaValue,
} from "../schema/validate"
import { normalizeTableColumns } from "./columns"
import { compileTableSchema } from "./compile"

const columns = normalizeTableColumns([
  { key: "title", type: "string", required: true },
  { key: "count", type: "integer" },
  { key: "score", type: "float" },
  { key: "done", type: "boolean" },
])

const schema = compileTableSchema(columns)

function issues(values: unknown) {
  return validateJsonSchemaValue(schema, values, "Row").map(
    (issue) => `${issue.path}: ${issue.message}`
  )
}

describe("compileTableSchema", () => {
  test("maps columns to a closed object schema with required keys", () => {
    expect(schema).toEqual({
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        count: { type: "integer" },
        score: { type: "number" },
        done: { type: "boolean" },
      },
      required: ["title"],
    })
  })

  test("omits required entirely when every column is optional", () => {
    expect(
      compileTableSchema(
        normalizeTableColumns([{ key: "note", type: "string" }])
      )
    ).toEqual({
      type: "object",
      additionalProperties: false,
      properties: { note: { type: "string" } },
    })
  })
})

describe("compiled row validation", () => {
  test("accepts a row matching every column type", () => {
    expect(() =>
      assertJsonSchemaValue({
        schema,
        value: { title: "Launch", count: 3, score: 0.5, done: false },
        label: "Row",
      })
    ).not.toThrow()
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
