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

  test("rejects a schema that names no properties", () => {
    expect(() => normalizeStoreSchema({ type: "object" })).toThrow(
      "at least one property"
    )
    expect(() =>
      normalizeStoreSchema({ type: "object", properties: {} })
    ).toThrow("at least one property")
  })

  test("caps schema size", () => {
    expect(() =>
      normalizeStoreSchema({
        ...schema,
        description: "x".repeat(storeLimits.maxSchemaBytes),
      })
    ).toThrow("exceeds")
  })
})
