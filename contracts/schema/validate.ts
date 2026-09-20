import { isRecord, readStringArray } from "../json"
import { compileSchemaPattern } from "./pattern"
import { type JsonSchemaObject, type SchemaValidationIssue } from "./types"

// Validates JSON values against the supported JSON Schema subset described
// in ./normalize.ts. Runtime-neutral: usable from Convex, workers, and app
// code alike.

const anyObjectSchema: JsonSchemaObject = { type: "object" }

/** Resolve a possibly-absent authored schema to the constraint writes are
 *  validated against. This is the one place a missing schema gets its
 *  meaning: any JSON object is allowed. */
export function resolveWriteSchema(schema: JsonSchemaObject | undefined) {
  return schema ?? anyObjectSchema
}

export function assertJsonSchemaValue(input: {
  schema: JsonSchemaObject
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

export function validateJsonSchemaValue(
  schema: JsonSchemaObject,
  value: unknown,
  path: string
): SchemaValidationIssue[] {
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
): SchemaValidationIssue[] {
  const variants = readSchemaArray(variantsValue)

  if (variants === undefined) {
    return [{ path, message: "has an invalid anyOf schema" }]
  }

  return variants.some(
    (variant) => validateJsonSchemaValue(variant, value, path).length === 0
  )
    ? []
    : [{ path, message: "does not match any allowed shape" }]
}

function validateTypedNode(
  schema: JsonSchemaObject,
  value: unknown,
  path: string
): SchemaValidationIssue[] {
  // A bare const or enum node constrains the value on its own; the checks
  // above already ran, so there is no type left to enforce.
  if (
    schema.type === undefined &&
    (schema.const !== undefined || isEnum(schema))
  ) {
    return []
  }

  switch (schema.type) {
    case "array":
      return validateArray(schema, value, path)
    case "boolean":
      return typeof value === "boolean" ? [] : typeIssue(path, "boolean")
    case "integer":
      return Number.isInteger(value)
        ? validateNumber(schema, value as number, path)
        : typeIssue(path, "integer")
    case "null":
      return value === null ? [] : typeIssue(path, "null")
    case "number":
      return typeof value === "number"
        ? validateNumber(schema, value, path)
        : typeIssue(path, "number")
    case "object":
      return validateObject(schema, value, path)
    case "string":
      return typeof value === "string"
        ? validateString(schema, value, path)
        : typeIssue(path, "string")
    default:
      return [{ path, message: "uses unsupported schema type" }]
  }
}

function validateObject(
  schema: JsonSchemaObject,
  value: unknown,
  path: string
) {
  if (!isRecord(value)) {
    return typeIssue(path, "object")
  }

  const properties = isRecord(schema.properties) ? schema.properties : {}
  const issues = [
    ...validateSize(schema, Object.keys(value).length, path, "Properties"),
    ...readStringArray(schema.required).flatMap((key) =>
      Object.hasOwn(value, key)
        ? []
        : [{ path: `${path}.${key}`, message: "is required" }]
    ),
  ]

  for (const [key, entryValue] of Object.entries(value)) {
    if (isRecord(schema.propertyNames)) {
      issues.push(
        ...validateJsonSchemaValue(
          schema.propertyNames,
          key,
          `${path}.${key} key`
        )
      )
    }

    const childSchema = properties[key]

    if (isRecord(childSchema)) {
      issues.push(
        ...validateJsonSchemaValue(childSchema, entryValue, `${path}.${key}`)
      )
    } else if (isRecord(schema.additionalProperties)) {
      issues.push(
        ...validateJsonSchemaValue(
          schema.additionalProperties,
          entryValue,
          `${path}.${key}`
        )
      )
    } else if (schema.additionalProperties === false) {
      issues.push({ path: `${path}.${key}`, message: "is not allowed" })
    }
  }

  return issues
}

function validateArray(schema: JsonSchemaObject, value: unknown, path: string) {
  if (!Array.isArray(value)) {
    return typeIssue(path, "array")
  }

  if (schema.items !== undefined && !isRecord(schema.items)) {
    return [{ path, message: "has an invalid item schema" }]
  }

  return [
    ...validateSize(schema, value.length, path, "Items"),
    ...(isRecord(schema.items)
      ? value.flatMap((item, index) =>
          validateJsonSchemaValue(
            schema.items as JsonSchemaObject,
            item,
            `${path}.${index}`
          )
        )
      : []),
  ]
}

function validateString(
  schema: JsonSchemaObject,
  value: string,
  path: string
): SchemaValidationIssue[] {
  const issues = validateSize(schema, value.length, path, "Length")

  if (schema.pattern === undefined) {
    return issues
  }
  if (typeof schema.pattern !== "string") {
    return [...issues, { path, message: "pattern must be a string" }]
  }

  try {
    if (!compileSchemaPattern(schema.pattern).test(value)) {
      issues.push({ path, message: "does not match required pattern" })
    }
  } catch (error) {
    issues.push({
      path,
      message:
        error instanceof Error ? error.message : "uses an invalid pattern",
    })
  }

  return issues
}

function validateNumber(
  schema: JsonSchemaObject,
  value: number,
  path: string
): SchemaValidationIssue[] {
  if (!Number.isFinite(value)) {
    return [{ path, message: "must be finite" }]
  }

  const bounds = [
    ["minimum", (bound: number) => value >= bound, "at least"],
    ["maximum", (bound: number) => value <= bound, "at most"],
    ["exclusiveMinimum", (bound: number) => value > bound, "greater than"],
    ["exclusiveMaximum", (bound: number) => value < bound, "less than"],
  ] as const

  return bounds.flatMap(([key, accepts, label]) => {
    const bound = schema[key]
    return typeof bound !== "number" || accepts(bound)
      ? []
      : [{ path, message: `must be ${label} ${bound}` }]
  })
}

function validateSize(
  schema: JsonSchemaObject,
  size: number,
  path: string,
  label: "Items" | "Length" | "Properties"
): SchemaValidationIssue[] {
  const minimum = schema[`min${label}`]
  const maximum = schema[`max${label}`]

  return [
    ...(typeof minimum === "number" && size < minimum
      ? [{ path, message: `must contain at least ${minimum}` }]
      : []),
    ...(typeof maximum === "number" && size > maximum
      ? [{ path, message: `must contain at most ${maximum}` }]
      : []),
  ]
}

function readSchemaArray(value: unknown) {
  return Array.isArray(value) && value.every(isRecord) ? value : undefined
}

function isEnum(
  schema: JsonSchemaObject
): schema is JsonSchemaObject & { enum: unknown[] } {
  return Array.isArray(schema.enum)
}

function sameJsonValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function typeIssue(path: string, expected: string) {
  return [{ path, message: `must be ${expected}` }]
}
