export type JsonSchema = Record<string, unknown>
export type SchemaMap = Record<string, JsonSchema>

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
