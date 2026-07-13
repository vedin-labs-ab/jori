import { isRecord, type JsonObject } from "./json"
import { validateJsonSchemaValue } from "./validation"

type ValidationIssue = {
  path: string
  message: string
}

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

export function assertJsonSchemaValue(input: {
  schema: JsonObject
  value: unknown
  label: string
}) {
  const issues = validateJsonSchemaValue(input.schema, input.value, input.label)

  if (issues.length > 0) {
    throw new Error(
      issues
        .slice(0, 5)
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("; ")
    )
  }
}

export function assertSupportedJsonSchema(schema: JsonObject) {
  if (schema.type !== "object") {
    throw new Error("Artifact contract schemas must describe JSON objects.")
  }

  const issues = validateSchemaNode(schema, "schema")

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

  const normalized: JsonObject = {}

  for (const [key, entryValue] of Object.entries(value)) {
    if (key === "$schema") {
      continue
    }

    if (key.startsWith("$")) {
      throw new Error(
        `${path}.${key} is not supported. Artifact schemas must be fully inlined.`
      )
    }

    normalized[key] = normalizeSchemaNode(entryValue, `${path}.${key}`)
  }

  return normalized
}

function validateSchemaNode(schema: unknown, path: string): ValidationIssue[] {
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

function validateSchemaType(schema: JsonObject, path: string) {
  const schemaType = schema.type

  if (
    schemaType === undefined &&
    (schema.const !== undefined || isEnum(schema))
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

function isEnum(
  schema: JsonObject
): schema is JsonObject & { enum: unknown[] } {
  return Array.isArray(schema.enum)
}

const supportedTypes = new Set([
  "array",
  "boolean",
  "integer",
  "null",
  "number",
  "object",
  "string",
])
