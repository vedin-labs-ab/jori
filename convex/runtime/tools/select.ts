import { type ToolSurface } from "../../../contracts/integrations"
import { type JsonObject } from "../../../contracts/json"
import { type RuntimeTool } from "../../../contracts/runtime/context"
import { readFinal } from "../../../contracts/runtime/tools"

export function findTool(tools: RuntimeTool[], name: string) {
  const tool = tools.find((candidate) => candidate.name === name)

  if (tool === undefined) {
    throw new Error(`Unknown runtime tool: ${name}`)
  }

  return tool
}

export function requireSurface(tool: RuntimeTool): ToolSurface {
  if (tool.surface === undefined) {
    throw new Error(`Tool has no Convex surface: ${tool.name}`)
  }

  return tool.surface
}

export function shouldFinishConvexTool(toolName: string, input: JsonObject) {
  return toolName === "offer_integration" && readFinal(input)
}
