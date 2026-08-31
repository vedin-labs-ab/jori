import { type JsonObject, readStringArray } from "../../../contracts/json"
import {
  isJsonSchema,
  type JsonSchema,
  readSchemaMap,
  readString,
} from "../../runs/agent/tools/schemas"
import { optionalNumber } from "../../shared/input"

export function validateSchemaValue(
  value: unknown,
  schema: JsonSchema,
  path: string
) {
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

  for (const variant of orderVariants(value, variants)) {
    try {
      validateSchemaValue(value, variant, path)
      return
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  throw new Error(`${path} must match one supported shape: ${errors[0]}`)
}

function orderVariants(value: unknown, variants: JsonSchema[]) {
  if (!isJsonObject(value)) {
    return variants
  }

  const matching = variants.filter((variant) =>
    matchesDiscriminator(value, variant)
  )

  if (matching.length === 0) {
    return variants
  }

  const unmatched = variants.filter((variant) => !matching.includes(variant))

  return [...matching, ...unmatched]
}

function matchesDiscriminator(value: JsonObject, variant: JsonSchema) {
  const properties = readSchemaMap(variant.properties)

  return Object.entries(properties).some(([key, property]) => {
    if (!hasOwn(value, key)) {
      return false
    }

    const values = Array.isArray(property.enum) ? property.enum : []

    return values.length === 1 && values[0] === value[key]
  })
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
      validateSchemaValue(value[key], propertySchema, `${path}.${key}`)
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
      validateSchemaValue(value[key], additional, `${path}.${key}`)
    }
  }
}

function validateArray(value: unknown, schema: JsonSchema, path: string) {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array`)
  }

  validateArrayLength(value, schema, path)

  const itemSchema = isJsonSchema(schema.items) ? schema.items : undefined

  if (itemSchema === undefined) {
    return
  }

  value.forEach((item, index) => {
    validateSchemaValue(item, itemSchema, `${path}[${index}]`)
  })
}

function validateArrayLength(
  value: unknown[],
  schema: JsonSchema,
  path: string
) {
  const minItems = optionalNumber(schema.minItems)
  const maxItems = optionalNumber(schema.maxItems)

  if (minItems !== undefined && value.length < minItems) {
    throw new Error(`${path} must contain at least ${minItems} item`)
  }

  if (maxItems !== undefined && value.length > maxItems) {
    throw new Error(`${path} must contain at most ${maxItems} items`)
  }
}

function validateNumber(value: unknown, schema: JsonSchema, path: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a number`)
  }

  const minimum = optionalNumber(schema.minimum)
  const maximum = optionalNumber(schema.maximum)

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

  const minLength = optionalNumber(schema.minLength)
  const maxLength = optionalNumber(schema.maxLength)
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

export function isJsonObject(value: unknown): value is JsonObject {
  return isJsonSchema(value)
}
const hasOwn = Object.hasOwn
