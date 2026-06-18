import { type ToolSurface } from "../../../permissions/catalog"
import { runtimeAssets } from "../../../runtime/_generated/assets"
import { base64Encode } from "../../../shared/encoding"
import { type McpToolDefinition } from "./definitions"

export function createBrokerMcpScript(args: {
  surface: ToolSurface
  tools: McpToolDefinition[]
}) {
  void args.surface
  void args.tools
  return runtimeAssets.mcp.broker
}

export function createToolDefinitionsEnv(tools: McpToolDefinition[]) {
  return encodeBase64Json(tools)
}

function encodeBase64Json(value: unknown) {
  return base64Encode(JSON.stringify(value))
}
