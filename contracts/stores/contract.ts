import { isRecord } from "../json"
import { assertJsonSerializable } from "../json/stable"
import {
  assertSupportedJsonSchema,
  normalizeJsonSchema,
} from "../schema/normalize"
import { type JsonSchemaObject } from "../schema/types"

// A store is one named JSON document: a single versioned value, optionally
// constrained by an authored JSON Schema that every write must satisfy.

export const storeLimits = {
  maxSchemaBytes: 64 * 1024,
  maxValueBytes: 256 * 1024,
}

/** Normalize a store's JSON Schema and check it is supported, names at
 *  least one property, and fits the schema byte budget. */
export function normalizeStoreSchema(value: unknown) {
  const schema = normalizeJsonSchema(value, "Store schema")

  assertSupportedJsonSchema(schema, "Store schema")
  assertNamedProperties(schema)
  assertJsonSerializable({
    label: "Store schema",
    maxBytes: storeLimits.maxSchemaBytes,
    value: schema,
  })

  return schema
}

/** A schema with no properties constrains nothing, which is what a store
 *  without a schema already means. Refuse it rather than store the
 *  ambiguity; removing the schema is how a store opens back up. */
function assertNamedProperties(schema: JsonSchemaObject) {
  const { properties } = schema

  if (!isRecord(properties) || Object.keys(properties).length === 0) {
    throw new Error("Store schema must name at least one property.")
  }
}
