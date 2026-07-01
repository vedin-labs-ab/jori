export type JsonSchema = Record<string, unknown>
export type SchemaMap = Record<string, JsonSchema>

export const optionalFieldGuidance =
  "Omit optional fields unless you have a real value; do not pass empty strings, 0, empty arrays, null, or placeholders to mean absent."

export function objectSchema(args: {
  description?: string
  required?: string[]
  properties?: Record<string, unknown>
}): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    ...(args.description === undefined
      ? {}
      : { description: args.description }),
    ...(args.required === undefined ? {} : { required: args.required }),
    properties: args.properties ?? {},
  }
}

export function withOptionalFieldGuidance<Schema extends JsonSchema>(
  schema: Schema
): Schema {
  if (!schemaHasOptionalFields(schema)) {
    return schema
  }

  return {
    ...schema,
    description: appendGuidance(readString(schema.description)),
  } as Schema
}

export function schemaHasOptionalFields(schema: JsonSchema): boolean {
  if (objectHasOptionalField(schema)) {
    return true
  }

  return childSchemas(schema).some(schemaHasOptionalFields)
}

export function emptyObjectSchema() {
  return objectSchema({})
}

export function stringProperty(description: string) {
  return { type: "string", description }
}

export function stringArrayProperty(description: string) {
  return {
    type: "array",
    description,
    items: { type: "string" },
  }
}

export function numberProperty(
  description: string,
  minimum?: number,
  maximum?: number
) {
  return {
    type: "number",
    description,
    ...(minimum === undefined ? {} : { minimum }),
    ...(maximum === undefined ? {} : { maximum }),
  }
}

export function objectProperty(description: string) {
  return {
    type: "object",
    description,
    additionalProperties: true,
  }
}

export function runAssetsProperty() {
  return {
    type: "array",
    description:
      "Run assets to send. Create them with save_asset or find existing assets with search_assets, then pass asset IDs here.",
    items: objectSchema({
      required: ["assetId"],
      properties: {
        assetId: stringProperty("Asset ID returned by save_asset."),
        name: stringProperty("Optional asset filename override."),
        mimeType: stringProperty("Optional asset content type override."),
      },
    }),
  }
}

function appendGuidance(description: string | undefined) {
  if (description === undefined || description.trim() === "") {
    return optionalFieldGuidance
  }

  return description.includes(optionalFieldGuidance)
    ? description
    : `${description.trim()} ${optionalFieldGuidance}`
}

function objectHasOptionalField(schema: JsonSchema) {
  if (schema.type !== "object") {
    return false
  }

  const properties = readSchemaMap(schema.properties)
  const required = new Set(readStringArray(schema.required))

  return Object.keys(properties).some((key) => !required.has(key))
}

function childSchemas(schema: JsonSchema) {
  return [
    ...Object.values(readSchemaMap(schema.properties)),
    ...readSchemaArray(schema.oneOf),
    ...readSchemaArray(schema.anyOf),
    ...readSchemaArray(schema.allOf),
    ...(isJsonSchema(schema.items) ? [schema.items] : []),
    ...(isJsonSchema(schema.additionalProperties)
      ? [schema.additionalProperties]
      : []),
  ]
}

function readSchemaArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isJsonSchema) : []
}

export function readSchemaMap(value: unknown) {
  if (!isJsonSchema(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, JsonSchema] =>
      isJsonSchema(entry[1])
    )
  )
}

export function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

export function readString(value: unknown) {
  return typeof value === "string" ? value : undefined
}

export function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

export function isJsonSchema(value: unknown): value is JsonSchema {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
