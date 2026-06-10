export type JsonSchema = Record<string, unknown>
export type SchemaMap = Record<string, JsonSchema>

export function objectSchema(args: {
  required?: string[]
  properties?: Record<string, unknown>
}): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
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
