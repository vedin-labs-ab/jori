import { isRecord } from "../json"
import { type JsonSchemaObject, type SchemaValidationIssue } from "./validate"

// The supported JSON Schema subset: fully inlined object schemas using the
// primitive types below plus anyOf, const, and enum. No $ref, so a schema
// is always self-contained and safe to store next to the data it describes.

const supportedTypes = new Set([
  "array",
  "boolean",
  "integer",
  "null",
  "number",
  "object",
  "string",
])

/** Normalize an object-level JSON Schema: strip $schema, reject $-keywords,
 *  and require a top-level object shape. */
export function normalizeJsonSchema(value: unknown, label = "schema") {
  const schema = normalizeSchemaNode(value, label)

  if (!isRecord(schema)) {
    throw new Error(`${label} must be a JSON Schema object.`)
  }

  if (schema.type !== "object") {
    throw new Error(`${label} must describe a JSON object.`)
  }

  return schema
}

/** Like normalizeJsonSchema, but allows any supported root type — for
 *  schemas that may describe non-object values. */
export function normalizeJsonValueSchema(value: unknown, label = "schema") {
  const schema = normalizeSchemaNode(value, label)

  if (!isRecord(schema)) {
    throw new Error(`${label} must be a JSON Schema object.`)
  }

  return schema
}

export function assertSupportedJsonSchema(
  schema: JsonSchemaObject,
  label = "schema"
) {
  const issues = validateSchemaNode(schema, label)

  if (issues.length > 0) {
    throw new Error(
      issues
        .slice(0, 5)
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("; ")
    )
  }
}

function normalizeSchemaNode(value: unknown, path: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      normalizeSchemaNode(item, `${path}.${index}`)
    )
  }

  if (!isRecord(value)) {
    return value
  }

  const normalized: JsonSchemaObject = {}

  for (const [key, entryValue] of Object.entries(value)) {
    if (key === "$schema") {
      continue
    }

    if (key.startsWith("$")) {
      throw new Error(
        `${path}.${key} is not supported. Schemas must be fully inlined.`
      )
    }

    normalized[key] = normalizeSchemaNode(entryValue, `${path}.${key}`)
  }

  return normalized
}

export function validateSchemaNode(
  schema: unknown,
  path: string
): SchemaValidationIssue[] {
  if (!isRecord(schema)) {
    return [{ path, message: "must be a JSON Schema object" }]
  }

  const variants = readSchemaArray(schema.anyOf, `${path}.anyOf`)

  if (variants !== undefined) {
    return variants.flatMap((variant, index) =>
      validateSchemaNode(variant, `${path}.anyOf.${index}`)
    )
  }

  const typeIssues = validateSchemaType(schema, path)
  const properties = schema.properties
  const items = schema.items
  const additionalProperties = schema.additionalProperties
  const propertyNames = schema.propertyNames

  return [
    ...typeIssues,
    ...(isRecord(properties)
      ? Object.entries(properties).flatMap(([key, property]) =>
          validateSchemaNode(property, `${path}.properties.${key}`)
        )
      : []),
    ...(items === undefined ? [] : validateSchemaNode(items, `${path}.items`)),
    ...(isRecord(additionalProperties)
      ? validateSchemaNode(additionalProperties, `${path}.additionalProperties`)
      : []),
    ...(isRecord(propertyNames)
      ? validateSchemaNode(propertyNames, `${path}.propertyNames`)
      : []),
  ]
}

function validateSchemaType(schema: JsonSchemaObject, path: string) {
  const schemaType = schema.type

  if (
    schemaType === undefined &&
    (schema.const !== undefined || Array.isArray(schema.enum))
  ) {
    return []
  }

  if (typeof schemaType !== "string") {
    return [{ path, message: "must declare a supported type" }]
  }

  return supportedTypes.has(schemaType)
    ? []
    : [{ path, message: `uses unsupported type ${schemaType}` }]
}

function readSchemaArray(value: unknown, path: string) {
  if (value === undefined) {
    return undefined
  }

  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new Error(`${path} must contain JSON Schema objects.`)
  }

  return value
}
