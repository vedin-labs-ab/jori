import { type JsonSchema, type SchemaMap } from "../fragments/common"

// Response schemas describe what a tool call returns to the agent. Tools
// whose results Milo shapes itself get exact schemas built from the shared
// fragment vocabulary; tools that hand a provider payload through unchanged
// get an open object naming that payload, so the schema stays honest
// without mirroring an API Milo does not own.

export {
  arrayProperty,
  booleanProperty,
  constProperty,
  enumProperty,
  type JsonSchema,
  nullableStringProperty,
  numberProperty,
  objectSchema,
  type SchemaMap,
  stringProperty,
} from "../fragments/common"

/** A provider payload returned unchanged: an open object naming its source. */
export function providerPayload(description: string): JsonSchema {
  return {
    type: "object",
    additionalProperties: true,
    description,
  }
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
