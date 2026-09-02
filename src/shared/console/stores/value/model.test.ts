import { describe, expect, test } from "vitest"
import { schemaToForm } from "./model"

function form(schema: unknown) {
  return schemaToForm(schema)
}

function properties(schema: unknown) {
  const derived = form(schema)

  if (derived?.kind !== "object") {
    throw new Error("Expected an object form.")
  }

  return derived.properties
}

describe("schemaToForm primitives", () => {
  test("maps each primitive type onto its widget kind", () => {
    const [text, count, price, done] = properties({
      type: "object",
      properties: {
        text: { type: "string" },
        count: { type: "integer" },
        price: { type: "number" },
        done: { type: "boolean" },
      },
      required: ["text", "count", "price", "done"],
    })

    expect(text?.field).toEqual({ kind: "string" })
    expect(count?.field).toEqual({ kind: "number", integer: true })
    expect(price?.field).toEqual({ kind: "number", integer: false })
    expect(done?.field).toEqual({ kind: "boolean" })
  })

  test("an optional boolean becomes a true/false choice with unset", () => {
    const [done] = properties({
      type: "object",
      properties: { done: { type: "boolean" } },
    })

    expect(done?.field).toEqual({ kind: "enum", options: [true, false] })
  })

  test("constraint keywords never block the form", () => {
    const derived = form({
      type: "object",
      minProperties: 1,
      additionalProperties: false,
      properties: {
        name: { type: "string", pattern: "^[a-z]+$", minLength: 2 },
        age: { type: "integer", minimum: 0, exclusiveMaximum: 200 },
        tags: { type: "array", items: { type: "string" }, maxItems: 5 },
      },
    })

    expect(derived).toBeDefined()
  })
})

describe("schemaToForm enum and const", () => {
  test("scalar enums become choices, with or without a type", () => {
    const [status, level] = properties({
      type: "object",
      properties: {
        status: { enum: ["draft", "sent", null] },
        level: { type: "integer", enum: [1, 2, 3] },
      },
    })

    expect(status?.field).toEqual({
      kind: "enum",
      options: ["draft", "sent", null],
    })
    expect(level?.field).toEqual({ kind: "enum", options: [1, 2, 3] })
  })

  test("const and null-typed nodes become fixed constants", () => {
    const [kind, nothing] = properties({
      type: "object",
      properties: {
        kind: { const: "invoice" },
        nothing: { type: "null" },
      },
    })

    expect(kind?.field).toEqual({ kind: "constant", value: "invoice" })
    expect(nothing?.field).toEqual({ kind: "constant", value: null })
  })

  test("enums of compound values stay code-only", () => {
    expect(
      form({
        type: "object",
        properties: { status: { enum: [{ complex: true }] } },
      })
    ).toBeUndefined()
    expect(
      form({ type: "object", properties: { status: { enum: [] } } })
    ).toBeUndefined()
  })
})

describe("schemaToForm nesting", () => {
  test("nested objects, arrays of objects, and nested arrays derive", () => {
    const [address, lines, matrix] = properties({
      type: "object",
      properties: {
        address: {
          type: "object",
          properties: { city: { type: "string" } },
          required: ["city"],
        },
        lines: {
          type: "array",
          items: {
            type: "object",
            properties: { amount: { type: "number" } },
          },
        },
        matrix: {
          type: "array",
          items: { type: "array", items: { type: "integer" } },
        },
      },
    })

    expect(address?.field).toEqual({
      kind: "object",
      properties: [{ name: "city", required: true, field: { kind: "string" } }],
    })
    expect(lines?.field.kind).toBe("array")
    expect(matrix?.field).toEqual({
      kind: "array",
      items: { kind: "array", items: { kind: "number", integer: true } },
    })
  })

  test("an object without properties derives as an empty group", () => {
    const [notes] = properties({
      type: "object",
      properties: { notes: { type: "object" } },
    })

    expect(notes?.field).toEqual({ kind: "object", properties: [] })
  })
})

describe("schemaToForm code-only constructs", () => {
  const codeOnly: [string, unknown][] = [
    [
      "anyOf",
      { type: "object", properties: { a: { anyOf: [{ type: "string" }] } } },
    ],
    [
      "map-like additionalProperties",
      { type: "object", additionalProperties: { type: "number" } },
    ],
    [
      "propertyNames",
      { type: "object", propertyNames: { pattern: "^[a-z]+$" } },
    ],
    [
      "array without items",
      { type: "object", properties: { a: { type: "array" } } },
    ],
    [
      "required key without a property",
      {
        type: "object",
        properties: { a: { type: "string" } },
        required: ["b"],
      },
    ],
    ["non-object root", { type: "string" }],
    ["untyped node", { type: "object", properties: { a: {} } }],
    ["not a schema", null],
  ]

  test.each(codeOnly)("%s stays code-only", (_label, schema) => {
    expect(form(schema)).toBeUndefined()
  })
})
