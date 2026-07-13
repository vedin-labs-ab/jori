import { type ToolSurface } from "../../contracts/integrations"
import { readFinal } from "../../contracts/runtime/tools"
import { type JsonObject, type RuntimeTool } from "../types"

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
