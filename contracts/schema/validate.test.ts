import { describe, expect, test } from "vitest"
import { validateJsonSchemaValue } from "./validate"

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["name"],
  properties: {
    name: { type: "string", minLength: 1 },
    count: { type: "integer", minimum: 0 },
    tags: { type: "array", items: { type: "string" } },
    status: { enum: ["open", "closed"] },
  },
}

describe("validateJsonSchemaValue", () => {
  test("accepts a matching document", () => {
    expect(
      validateJsonSchemaValue(
        schema,
        { name: "Launch", count: 2, tags: ["q3"], status: "open" },
        "value"
      )
    ).toEqual([])
  })

  test("reports missing required and mistyped fields", () => {
    const issues = validateJsonSchemaValue(
      schema,
      { count: "two", tags: [1] },
      "value"
    )

    expect(issues.map((issue) => issue.path)).toEqual([
      "value.name",
      "value.count",
      "value.tags.0",
    ])
  })

  test("rejects unknown properties when additionalProperties is false", () => {
    expect(
      validateJsonSchemaValue(schema, { name: "x", extra: true }, "value")
    ).toEqual([{ path: "value.extra", message: "is not allowed" }])
  })

  test("rejects values outside an enum", () => {
    expect(
      validateJsonSchemaValue(schema, { name: "x", status: "paused" }, "value")
    ).toEqual([
      { path: "value.status", message: "does not match allowed enum values" },
    ])
  })

  test("accepts any variant of an anyOf schema", () => {
    const variantSchema = {
      anyOf: [{ type: "string" }, { type: "null" }],
    }

    expect(validateJsonSchemaValue(variantSchema, "text", "value")).toEqual([])
    expect(validateJsonSchemaValue(variantSchema, null, "value")).toEqual([])
    expect(validateJsonSchemaValue(variantSchema, 3, "value")).toEqual([
      { path: "value", message: "does not match any allowed shape" },
    ])
  })

  test("enforces numeric bounds and string patterns", () => {
    expect(
      validateJsonSchemaValue({ type: "number", maximum: 5 }, 6, "value")
    ).toEqual([{ path: "value", message: "must be at most 5" }])
    expect(
      validateJsonSchemaValue(
        { type: "string", pattern: "^[a-z]+$" },
        "Nope",
        "value"
      )
    ).toEqual([{ path: "value", message: "does not match required pattern" }])
  })
})

test("authored patterns preserve search, anchors and Unicode escapes", () => {
  for (const [pattern, value] of [
    ["abc", "prefix abc suffix"],
    ["^[a-z]+$", "valid"],
    ["^\\u0041+$", "AAA"],
    ["^\\u{1F600}$", "😀"],
  ]) {
    expect(
      validateJsonSchemaValue({ type: "string", pattern }, value, "value")
    ).toEqual([])
  }
  expect(
    validateJsonSchemaValue(
      { type: "string", pattern: "^abc$" },
      "prefix abc suffix",
      "value"
    )
  ).toHaveLength(1)
})

test("nested quantifiers cannot block validation of an untrusted value", () => {
  const pattern = "^(a+)+$"
  const value = `${"a".repeat(32_768)}!`
  expect(
    validateJsonSchemaValue({ type: "string", pattern }, value, "value")
  ).toEqual([{ path: "value", message: "does not match required pattern" }])
})

test("unvalidated stored schemas reject unsupported patterns without executing them", () => {
  for (const pattern of ["(?=a)a", "(a)\\1", "[", "a".repeat(513), 123]) {
    expect(
      validateJsonSchemaValue({ type: "string", pattern }, "aa", "value")
    ).toHaveLength(1)
  }
})

test("the supported pattern dialect has explicit RE2 whitespace and anchor semantics", () => {
  const matches = (pattern: string, value: string) =>
    validateJsonSchemaValue({ type: "string", pattern }, value, "value")
      .length === 0
  expect(matches("^a$", "a\n")).toBe(false)
  expect(matches("^\\s$", "\u00a0")).toBe(false)
  expect(matches("^\\s$", " ")).toBe(true)
  expect(matches("^.$", "\r")).toBe(true)
  expect(matches("^.$", "\n")).toBe(false)
})
