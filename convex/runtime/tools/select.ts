import { type ToolSurface } from "../../../contracts/integrations"
import { type JsonObject } from "../../../contracts/json"
import { readFinal } from "../../../contracts/runtime/tools"
import { validateSchemaValue } from "../../broker/input/validation"
import { type RuntimeTool } from "../platform/types"

export function validateRuntimeToolInput(tool: RuntimeTool, input: JsonObject) {
  if (tool.mode === "blocked") {
    throw new Error(`Tool is blocked: ${tool.name}`)
  }

  // Broker calls apply provider-specific normalization and validation there.
  // Native tools and worker-side Jori tools never pass through that boundary.
  if (
    tool.route !== "convex" ||
    tool.name === "save_file" ||
    tool.name === "generate_image"
  ) {
    validateSchemaValue(input, tool.inputSchema, tool.name)
  }
}

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
