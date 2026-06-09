import {
  getToolPermissionsByProvider,
  type ToolProvider,
} from "../../permissions/catalog"

export type McpToolDefinition = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export function getProviderToolDefinitions(provider: ToolProvider) {
  return getToolPermissionsByProvider(provider).map((permission) => ({
    name: permission.tool,
    description: permission.description,
    inputSchema: {
      type: "object",
      additionalProperties: true,
      properties: {},
    },
  })) satisfies McpToolDefinition[]
}
