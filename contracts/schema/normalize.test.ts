import { describe, expect, test } from "vitest"
import {
  assertSupportedJsonSchema,
  normalizeJsonSchema,
  normalizeJsonValueSchema,
} from "./normalize"

describe("normalizeJsonSchema", () => {
  test("strips $schema and keeps the rest", () => {
    expect(
      normalizeJsonSchema({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: { name: { type: "string" } },
      })
    ).toEqual({
      type: "object",
      properties: { name: { type: "string" } },
    })
  })

  test("rejects $ref so schemas stay self-contained", () => {
    expect(() =>
      normalizeJsonSchema({
        type: "object",
        properties: { child: { $ref: "#/defs/child" } },
      })
    ).toThrow("fully inlined")
  })

  test("requires an object-shaped root", () => {
    expect(() => normalizeJsonSchema({ type: "array" })).toThrow(
      "must describe a JSON object"
    )
    expect(() => normalizeJsonSchema("nope")).toThrow(
      "must be a JSON Schema object"
    )
  })

  test("value schemas may describe any supported root type", () => {
    expect(normalizeJsonValueSchema({ type: "array" })).toEqual({
      type: "array",
    })
  })
})

describe("assertSupportedJsonSchema", () => {
  test("accepts the supported subset", () => {
    expect(() =>
      assertSupportedJsonSchema({
        type: "object",
        properties: {
          status: { enum: ["open", "closed"] },
          nested: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
      })
    ).not.toThrow()
  })

  test("rejects unsupported types anywhere in the tree", () => {
    expect(() =>
      assertSupportedJsonSchema({
        type: "object",
        properties: { when: { type: "date" } },
      })
    ).toThrow("unsupported type date")
  })
})
