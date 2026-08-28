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
  test("returns the schema with a stable content hash", () => {
    const first = normalizeStoreSchema(schema)
    const second = normalizeStoreSchema({ $schema: "draft", ...schema })

    expect(first.schema).toEqual(schema)
    expect(first.schemaHash).toBe(second.schemaHash)
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
