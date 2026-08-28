import { describe, expect, test } from "vitest"
import { normalizeStoreSchema, storeLimits } from "./contract"

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    dispatches: {
      type: "object",
      additionalProperties: { type: "object", additionalProperties: true },
    },
  },
}

describe("normalizeStoreSchema", () => {
  test("returns the schema with meta keys stripped", () => {
    expect(normalizeStoreSchema(schema)).toEqual(schema)
    expect(normalizeStoreSchema({ $schema: "draft", ...schema })).toEqual(
      schema
    )
  })

  test("rejects non-object and unsupported schemas", () => {
    expect(() => normalizeStoreSchema({ type: "array" })).toThrow(
      "must describe a JSON object"
    )
    expect(() =>
      normalizeStoreSchema({
        type: "object",
        properties: { when: { type: "date" } },
      })
    ).toThrow("unsupported type")
  })

  test("caps schema size", () => {
    expect(() =>
      normalizeStoreSchema({
        type: "object",
        description: "x".repeat(storeLimits.maxSchemaBytes),
      })
    ).toThrow("exceeds")
  })
})
