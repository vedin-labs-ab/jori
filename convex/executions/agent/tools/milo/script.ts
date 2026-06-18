import { runtimeAssets } from "../../../../runtime/_generated/assets"
import { workspace } from "../../sandbox/harness"
import { type McpToolDefinition } from "../definitions"
import { type SandboxFile } from "../types"

export function createMiloMcpScript(args: { tools: McpToolDefinition[] }) {
  void args.tools

  return runtimeAssets.mcp.milo
}

export function createMiloMcpFiles(): SandboxFile[] {
  return Object.entries(runtimeAssets.mcp.miloFiles).map(
    ([filePath, content]) => ({
      path: `${workspace}/${filePath}`,
      content,
    })
  )
}
