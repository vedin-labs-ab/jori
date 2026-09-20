import { isRecord } from "../json"
import { type JsonSchemaObject } from "./types"

/** How many leaf properties the schema declares — the actual writable
 *  value slots. Objects are structure and don't count themselves; arrays
 *  count their item shape once, since repetition is data, not schema. A
 *  schema without a properties object counts zero; a store without a
 *  schema counts nothing at all. */
export function countLeafProperties(schema: JsonSchemaObject | undefined) {
  if (schema === undefined) {
    return undefined
  }

  return isRecord(schema.properties) ? countChildLeaves(schema.properties) : 0
}

/** A node's slots: objects with declared properties recurse, arrays defer
 *  to their item shape, and anything else — scalars, free-form objects,
 *  untyped nodes — is one slot. */
function countNodeLeaves(node: unknown): number {
  if (!isRecord(node)) {
    return 1
  }

  if (isRecord(node.properties)) {
    return countChildLeaves(node.properties)
  }

  return isRecord(node.items) ? countNodeLeaves(node.items) : 1
}

function countChildLeaves(properties: Record<string, unknown>) {
  return Object.values(properties).reduce<number>(
    (total, child) => total + countNodeLeaves(child),
    0
  )
}
