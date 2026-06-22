import { type JsonObject, type JsonValue } from "../../contracts/json"
import { getToolInputSchema } from "../runs/agent/tools/schemas"

type JsonSchema = Record<string, unknown>

export function hasBrokerToolInputSchema(tool: string) {
  return getToolInputSchema(tool) !== undefined
}

export function normalizeBrokerToolInput(
  tool: string,
  input: unknown
): JsonObject {
  const schema = getToolInputSchema(tool)

  if (schema === undefined) {
    throw new Error(`Missing input schema for tool: ${tool}`)
  }

  validateValue(input, schema, tool)

  if (!isJsonObject(input)) {
    throw new Error(`${tool} must be an object`)
  }

  return input
}

function validateValue(value: unknown, schema: JsonSchema, path: string) {
  const variants = readSchemaArray(schema.oneOf)

  if (variants.length > 0) {
    validateOneOf(value, variants, path)
    return
  }

  validateEnum(value, schema, path)

  const type = readString(schema.type)

  if (type === undefined) {
    return
  }

  if (type === "object") {
    validateObject(value, schema, path)
    return
  }

  if (type === "array") {
    validateArray(value, schema, path)
    return
  }

  if (type === "string" && typeof value !== "string") {
    throw new Error(`${path} must be a string`)
  }

  if (type === "number") {
    validateNumber(value, schema, path)
  }

  if (type === "boolean" && typeof value !== "boolean") {
    throw new Error(`${path} must be a boolean`)
  }
}

function validateOneOf(value: unknown, variants: JsonSchema[], path: string) {
  const errors: string[] = []

  for (const variant of variants) {
    try {
      validateValue(value, variant, path)
      return
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  throw new Error(`${path} must match one supported shape: ${errors[0]}`)
}

function validateEnum(value: unknown, schema: JsonSchema, path: string) {
  const values = readJsonArray(schema.enum)

  if (values.length > 0 && !values.some((item) => item === value)) {
    throw new Error(`${path} must be one of: ${values.join(", ")}`)
  }
}

function validateObject(value: unknown, schema: JsonSchema, path: string) {
  if (!isJsonObject(value)) {
    throw new Error(`${path} must be an object`)
  }

  const properties = readSchemaMap(schema.properties)
  const required = readStringArray(schema.required)

  for (const key of required) {
    if (!hasOwn(value, key)) {
      throw new Error(`${path}.${key} is required`)
    }
  }

  validateObjectProperties(value, properties, path)
  validateAdditionalProperties(value, properties, schema, path)
}

function validateObjectProperties(
  value: JsonObject,
  properties: Record<string, JsonSchema>,
  path: string
) {
  for (const [key, propertySchema] of Object.entries(properties)) {
    if (hasOwn(value, key)) {
      validateValue(value[key], propertySchema, `${path}.${key}`)
    }
  }
}

function validateAdditionalProperties(
  value: JsonObject,
  properties: Record<string, JsonSchema>,
  schema: JsonSchema,
  path: string
) {
  const additional = schema.additionalProperties

  for (const key of Object.keys(value)) {
    if (hasOwn(properties, key)) {
      continue
    }

    if (additional === false) {
      throw new Error(`${path}.${key} is not supported`)
    }

    if (isJsonSchema(additional)) {
      validateValue(value[key], additional, `${path}.${key}`)
    }
  }
}

function validateArray(value: unknown, schema: JsonSchema, path: string) {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array`)
  }

  const itemSchema = readSchema(schema.items)

  if (itemSchema === undefined) {
    return
  }

  value.forEach((item, index) => {
    validateValue(item, itemSchema, `${path}[${index}]`)
  })
}

function validateNumber(value: unknown, schema: JsonSchema, path: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a number`)
  }

  const minimum = readNumber(schema.minimum)
  const maximum = readNumber(schema.maximum)

  if (minimum !== undefined && value < minimum) {
    throw new Error(`${path} must be at least ${minimum}`)
  }

  if (maximum !== undefined && value > maximum) {
    throw new Error(`${path} must be at most ${maximum}`)
  }
}

function readSchemaMap(value: unknown) {
  if (!isJsonSchema(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, JsonSchema] => isJsonSchema(entry[1]))
      .map(([key, schema]) => [key, schema])
  )
}

function readSchemaArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isJsonSchema) : []
}

function readJsonArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isJsonValue) : []
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function readSchema(value: unknown) {
  return isJsonSchema(value) ? value : undefined
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function isJsonSchema(value: unknown): value is JsonSchema {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isJsonObject(value: unknown): value is JsonObject {
  return isJsonSchema(value)
}

function isJsonValue(value: unknown): value is JsonValue {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    Array.isArray(value) ||
    isJsonObject(value)
  )
}

function hasOwn(value: object, key: string) {
  return Object.hasOwn(value, key)
}
