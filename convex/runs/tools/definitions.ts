import {
  getToolPermissionsByProvider,
  type ToolProvider,
} from "../../permissions/catalog"
import { emptyObjectSchema, getToolInputSchema } from "./schemas"

export type McpToolDefinition = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export function getProviderToolDefinitions(provider: ToolProvider) {
  return getToolPermissionsByProvider(provider).map((permission) => ({
    name: permission.tool,
    description: permission.description,
    inputSchema: getToolInputSchema(permission.tool) ?? emptyObjectSchema(),
  })) satisfies McpToolDefinition[]
}
