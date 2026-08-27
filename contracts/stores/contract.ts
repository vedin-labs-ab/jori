import { assertJsonSerializable, stableHash } from "../json/stable"
import {
  assertSupportedJsonSchema,
  normalizeJsonSchema,
} from "../schema/normalize"
import {
  assertJsonSchemaValue,
  type JsonSchemaObject,
} from "../schema/validate"

// A store is one named JSON document: a required JSON Schema fixed at
// creation and a single versioned value validated against it on every write.

export const storeLimits = {
  maxSchemaBytes: 64 * 1024,
  maxValueBytes: 256 * 1024,
}

/** Normalize and check a store's JSON Schema, returning it with its
 *  content hash so readers can cheaply tell schemas apart. */
export function normalizeStoreSchema(value: unknown) {
  const schema = normalizeJsonSchema(value, "Store schema")

  assertSupportedJsonSchema(schema, "Store schema")
  assertJsonSerializable({
    label: "Store schema",
    maxBytes: storeLimits.maxSchemaBytes,
    value: schema,
  })

  return { schema, schemaHash: stableHash(schema) }
}

export function assertStoreValue(input: {
  schema: JsonSchemaObject
  value: unknown
  name: string
}) {
  assertJsonSerializable({
    label: `Store ${input.name} value`,
    maxBytes: storeLimits.maxValueBytes,
    value: input.value,
  })
  assertJsonSchemaValue({
    label: input.name,
    schema: input.schema,
    value: input.value,
  })
}
