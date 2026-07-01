import { isArtifactPublishTool } from "../../contracts/artifact-publish"
import { type JsonObject } from "../../contracts/json"
import {
  getToolInputSchema,
  isJsonSchema,
  type JsonSchema,
  readNumber,
  readSchemaMap,
  readString,
  readStringArray,
} from "../runs/agent/tools/schemas"

export function hasBrokerToolInputSchema(tool: string) {
  return getToolInputSchema(tool) !== undefined
}

export function normalizeMiloToolInput(
  tool: string,
  input: unknown
): JsonObject {
  if (isArtifactPublishTool(tool)) {
    if (!isJsonObject(input)) {
      throw new Error(`${tool} must be an object`)
    }

    return input
  }

  return normalizeBrokerToolInput(tool, input)
}

export function normalizeBrokerToolInput(
  tool: string,
  input: unknown
): JsonObject {
  const schema = getToolInputSchema(tool)

  if (schema === undefined) {
    throw new Error(`Missing input schema for tool: ${tool}`)
  }

  const normalized = normalizeInput(tool, input)

  validateValue(normalized, schema, tool)

  if (!isJsonObject(normalized)) {
    throw new Error(`${tool} must be an object`)
  }

  return normalized
}

function normalizeInput(tool: string, input: unknown) {
  if (!isJsonObject(input)) {
    return input
  }

  const timestampFields = slackTimestampFields(tool)

  if (timestampFields.length === 0) {
    return input
  }

  const normalized = { ...input }

  for (const field of timestampFields) {
    if (
      typeof normalized[field] === "number" &&
      Number.isFinite(normalized[field])
    ) {
      normalized[field] = normalized[field].toString()
    }
  }

  return normalized
}

function slackTimestampFields(tool: string) {
  switch (tool) {
    case "conversations_add_message":
      return ["thread_ts"]
    case "conversations_history":
      return ["latest", "oldest"]
    case "conversations_replies":
      return ["ts"]
    case "slack_add_reaction":
      return ["timestamp"]
    default:
      return []
  }
}

function validateValue(value: unknown, schema: JsonSchema, path: string) {
  const variants = Array.isArray(schema.oneOf)
    ? schema.oneOf.filter(isJsonSchema)
    : []

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

  if (type === "string") {
    validateString(value, schema, path)
    return
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
  const values = Array.isArray(schema.enum) ? schema.enum : []

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

  const itemSchema = isJsonSchema(schema.items) ? schema.items : undefined

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

function validateString(value: unknown, schema: JsonSchema, path: string) {
  if (typeof value !== "string") {
    throw new Error(`${path} must be a string`)
  }

  const minLength = readNumber(schema.minLength)
  const maxLength = readNumber(schema.maxLength)
  const pattern = readString(schema.pattern)

  if (minLength !== undefined && value.length < minLength) {
    throw new Error(`${path} must be at least ${minLength} characters`)
  }

  if (maxLength !== undefined && value.length > maxLength) {
    throw new Error(`${path} must be at most ${maxLength} characters`)
  }

  if (pattern !== undefined && !new RegExp(pattern).test(value)) {
    throw new Error(`${path} has invalid format`)
  }

  if (schema.format === "uri") {
    try {
      new URL(value)
    } catch {
      throw new Error(`${path} must be a valid URI`)
    }
  }
}

function isJsonObject(value: unknown): value is JsonObject {
  return isJsonSchema(value)
}

const hasOwn = Object.hasOwn
