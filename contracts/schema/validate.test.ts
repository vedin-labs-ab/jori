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
