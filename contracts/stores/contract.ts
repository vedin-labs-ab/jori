import { assertJsonSerializable } from "../json/stable"
import {
  assertSupportedJsonSchema,
  normalizeJsonSchema,
} from "../schema/normalize"

// A store is one named JSON document: a required JSON Schema fixed at
// creation and a single versioned value validated against it on every write.

export const storeLimits = {
  maxSchemaBytes: 64 * 1024,
  maxValueBytes: 256 * 1024,
}

/** Normalize a store's JSON Schema and check it is supported and within
 *  the schema byte budget. */
export function normalizeStoreSchema(value: unknown) {
  const schema = normalizeJsonSchema(value, "Store schema")

  assertSupportedJsonSchema(schema, "Store schema")
  assertJsonSerializable({
    label: "Store schema",
    maxBytes: storeLimits.maxSchemaBytes,
    value: schema,
  })

  return schema
}
