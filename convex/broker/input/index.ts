import { type JsonObject } from "../../../contracts/json"
import { getToolInputSchema } from "../../../contracts/tools"
import { isJsonObject, validateSchemaValue } from "./validation"

export function normalizeBrokerToolInput(
  tool: string,
  input: unknown
): JsonObject {
  const schema = getToolInputSchema(tool)

  if (schema === undefined) {
    throw new Error(`Missing input schema for tool: ${tool}`)
  }

  const normalized = normalizeInput(tool, input)

  validateSchemaValue(normalized, schema, tool)

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
