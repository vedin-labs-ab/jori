import { isRecord, type JsonObject } from "./json"

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
  const issues = validateNode(input.schema, input.value, input.label)

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

  return [
    ...typeIssues,
    ...(isRecord(properties)
      ? Object.entries(properties).flatMap(([key, property]) =>
          validateSchemaNode(property, `${path}.properties.${key}`)
        )
      : []),
    ...(items === undefined ? [] : validateSchemaNode(items, `${path}.items`)),
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

function validateNode(
  schema: JsonObject,
  value: unknown,
  path: string
): ValidationIssue[] {
  if (schema.anyOf !== undefined) {
    return validateAnyOf(schema.anyOf, value, path)
  }

  if (schema.const !== undefined && !sameJsonValue(schema.const, value)) {
    return [{ path, message: "does not match required constant" }]
  }

  if (
    isEnum(schema) &&
    !schema.enum.some((option) => sameJsonValue(option, value))
  ) {
    return [{ path, message: "does not match allowed enum values" }]
  }

  return validateTypedNode(schema, value, path)
}

function validateAnyOf(
  variantsValue: unknown,
  value: unknown,
  path: string
): ValidationIssue[] {
  const variants = readSchemaArray(variantsValue, `${path}.anyOf`)

  if (variants === undefined) {
    return [{ path, message: "has an invalid anyOf schema" }]
  }

  return variants.some(
    (variant) => validateNode(variant, value, path).length === 0
  )
    ? []
    : [{ path, message: "does not match any allowed shape" }]
}

function validateTypedNode(
  schema: JsonObject,
  value: unknown,
  path: string
): ValidationIssue[] {
  switch (schema.type) {
    case "array":
      return validateArray(schema, value, path)
    case "boolean":
      return typeof value === "boolean" ? [] : typeIssue(path, "boolean")
    case "integer":
      return Number.isInteger(value) ? [] : typeIssue(path, "integer")
    case "null":
      return value === null ? [] : typeIssue(path, "null")
    case "number":
      return typeof value === "number" ? [] : typeIssue(path, "number")
    case "object":
      return validateObject(schema, value, path)
    case "string":
      return typeof value === "string" ? [] : typeIssue(path, "string")
    default:
      return [{ path, message: "uses unsupported schema type" }]
  }
}

function validateObject(schema: JsonObject, value: unknown, path: string) {
  if (!isRecord(value)) {
    return typeIssue(path, "object")
  }

  const properties = isRecord(schema.properties) ? schema.properties : {}
  const required = readStringArray(schema.required)
  const issues = required.flatMap((key) =>
    Object.hasOwn(value, key)
      ? []
      : [{ path: `${path}.${key}`, message: "is required" }]
  )

  for (const [key, entryValue] of Object.entries(value)) {
    const childSchema = properties[key]

    if (isRecord(childSchema)) {
      issues.push(...validateNode(childSchema, entryValue, `${path}.${key}`))
    } else if (schema.additionalProperties === false) {
      issues.push({ path: `${path}.${key}`, message: "is not allowed" })
    }
  }

  return issues
}

function validateArray(schema: JsonObject, value: unknown, path: string) {
  if (!Array.isArray(value)) {
    return typeIssue(path, "array")
  }

  if (schema.items !== undefined && !isRecord(schema.items)) {
    return [{ path, message: "has an invalid item schema" }]
  }

  return isRecord(schema.items)
    ? value.flatMap((item, index) =>
        validateNode(schema.items as JsonObject, item, `${path}.${index}`)
      )
    : []
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

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function isEnum(
  schema: JsonObject
): schema is JsonObject & { enum: unknown[] } {
  return Array.isArray(schema.enum)
}

function sameJsonValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function typeIssue(path: string, expected: string) {
  return [{ path, message: `must be ${expected}` }]
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
