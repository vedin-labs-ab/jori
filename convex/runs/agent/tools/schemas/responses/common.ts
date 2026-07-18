import { type JsonSchema, type SchemaMap } from "../fragments/common"

export type { JsonSchema, SchemaMap } from "../fragments/common"

// Response schemas describe what a tool call returns to the agent. Tools
// whose results Milo shapes itself get exact schemas; tools that hand a
// provider payload through unchanged get an open object naming that payload,
// so the schema stays honest without mirroring an API Milo does not own.

/** A provider payload returned unchanged: an open object naming its source. */
export function providerPayload(description: string): JsonSchema {
  return {
    type: "object",
    additionalProperties: true,
    description,
  }
}

/** An array of provider payloads returned unchanged. */
export function providerList(
  description: string,
  itemDescription: string
): JsonSchema {
  return {
    type: "array",
    description,
    items: providerPayload(itemDescription),
  }
}

/** A closed object whose fields are all produced by Milo's own code. */
export function resultSchema(args: {
  description?: string
  properties: Record<string, unknown>
  required?: string[]
}): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    ...(args.description === undefined
      ? {}
      : { description: args.description }),
    ...(args.required === undefined ? {} : { required: args.required }),
    properties: args.properties,
  }
}

export function stringField(description: string) {
  return { type: "string", description }
}

export function numberField(description: string) {
  return { type: "number", description }
}

export function booleanField(description: string) {
  return { type: "boolean", description }
}

export function nullableStringField(description: string) {
  return { type: ["string", "null"], description }
}

export function listField(description: string, items: unknown) {
  return { type: "array", description, items }
}

export function constField(value: string, description: string) {
  return { type: "string", const: value, description }
}

export function enumField(values: readonly string[], description: string) {
  return { type: "string", enum: [...values], description }
}

export function assertDisjointResponseKeys(maps: readonly SchemaMap[]) {
  const seen = new Set<string>()

  for (const map of maps) {
    for (const tool of Object.keys(map)) {
      if (seen.has(tool)) {
        throw new Error(`Duplicate tool response schema "${tool}".`)
      }
      seen.add(tool)
    }
  }
}
