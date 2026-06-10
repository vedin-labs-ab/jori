import {
  getToolPermissionsByProvider,
  resolveToolMode,
  type ToolProvider,
} from "../../permissions/catalog"
import { type ToolPermissionInput } from "./policy"
import { emptyObjectSchema, getToolInputSchema } from "./schemas"

export type McpToolDefinition = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export function getProviderToolDefinitions(
  provider: ToolProvider,
  input: Pick<ToolPermissionInput, "toolModes">
) {
  return getToolPermissionsByProvider(provider).map((permission) => ({
    name: permission.tool,
    description: permission.description,
    inputSchema:
      resolveToolMode(input.toolModes, permission.tool) === "prompted"
        ? withApprovalSchema(getToolInputSchema(permission.tool))
        : (getToolInputSchema(permission.tool) ?? emptyObjectSchema()),
  })) satisfies McpToolDefinition[]
}

function withApprovalSchema(schema: Record<string, unknown> | undefined) {
  const inputSchema = schema ?? emptyObjectSchema()
  const properties = readObject(inputSchema.properties)
  const required = readStringArray(inputSchema.required)

  return {
    ...inputSchema,
    type: "object",
    properties: {
      ...properties,
      approval: approvalInputSchema(),
    },
    required: [...new Set([...required, "approval"])],
  }
}

function approvalInputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["summary", "handoff"],
    properties: {
      summary: {
        type: "string",
        description:
          "Short user-facing description of the exact action and the details needed to judge it.",
      },
      handoff: {
        type: "object",
        additionalProperties: false,
        required: ["objective", "progress", "next"],
        properties: {
          objective: {
            type: "string",
            description: "The user's overall goal.",
          },
          progress: {
            type: "string",
            description:
              "Useful context gathered before approval, including anything already sent to the user.",
          },
          next: {
            type: "string",
            description:
              "What the continuation agent should do after the approved tool result is available.",
          },
        },
      },
    },
  }
}

function readObject(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value
    : {}
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}
