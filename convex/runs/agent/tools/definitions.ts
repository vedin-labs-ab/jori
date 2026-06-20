import {
  getToolPermissionsBySurface,
  resolveToolMode,
  type ToolSurface,
} from "../../../permissions/catalog"
import { type ToolExecutionType, type ToolPermissionInput } from "./policy"
import { emptyObjectSchema, getToolInputSchema } from "./schemas"

export type McpToolDefinition = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export function getSurfaceToolDefinitions(
  surface: ToolSurface,
  input: Pick<ToolPermissionInput, "toolModes"> & {
    executionType?: ToolExecutionType
  }
) {
  const executionType = input.executionType ?? "message"

  return getToolPermissionsBySurface(surface).map((permission) => ({
    name: permission.tool,
    description: permission.description,
    inputSchema:
      executionType === "message" &&
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
              "What the continuation agent should do after the user approves or denies the action.",
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
