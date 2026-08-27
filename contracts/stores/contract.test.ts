import { describe, expect, test } from "vitest"
import { assertStoreValue, normalizeStoreSchema, storeLimits } from "./contract"

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

describe("assertStoreValue", () => {
  test("accepts values matching the schema", () => {
    expect(() =>
      assertStoreValue({
        schema,
        value: { dispatches: { "morning:1": { status: "sent" } } },
        name: "dispatch-log",
      })
    ).not.toThrow()
  })

  test("rejects values the schema forbids", () => {
    expect(() =>
      assertStoreValue({
        schema,
        value: { unexpected: true },
        name: "dispatch-log",
      })
    ).toThrow("is not allowed")
  })

  test("rejects Convex-unsafe object keys", () => {
    expect(() =>
      assertStoreValue({
        schema,
        value: { dispatches: { _bad: {} } },
        name: "dispatch-log",
      })
    ).toThrow("Convex-safe")
  })
})
