import { isArtifactPublishTool } from "../../../contracts/artifacts/publish"
import { type JsonObject } from "../../../contracts/json"
import {
  getToolInputSchema,
  isJsonSchema,
} from "../../runs/agent/tools/schemas"
import { validateSchemaValue } from "./validation"

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

function isJsonObject(value: unknown): value is JsonObject {
  return isJsonSchema(value)
}
