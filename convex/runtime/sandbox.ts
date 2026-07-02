import {
  type CodingToolName,
  codingToolDefinitions,
} from "../../contracts/coding"
import { type ToolAccess } from "../../contracts/permissions"
import { withOptionalFieldGuidance } from "../runs/agent/tools/schemas"
import { type RunToolSnapshotTool } from "../runs/agent/tools/snapshot"
import { nativeToolSnapshot, nativeToolUsage } from "./permissions/native"

export const sandboxTools = [
  ...codingToolDefinitions.map((tool) => ({
    ...tool,
    access: codingToolAccess(tool.name),
    inputSchema: withOptionalFieldGuidance(tool.inputSchema),
    route: "sandbox" as const,
  })),
  {
    access: "write" as const,
    name: "start_agent",
    description: nativeToolUsage("start_agent", "agent"),
    inputSchema: withOptionalFieldGuidance({
      type: "object",
      additionalProperties: false,
      required: ["task"],
      properties: {
        task: { type: "string" },
        title: { type: "string" },
      },
    }),
    route: "agent",
  },
] as const

function codingToolAccess(name: CodingToolName): ToolAccess {
  switch (name) {
    case "glob":
    case "grep":
    case "git":
    case "read":
      return "read"
    case "apply_patch":
    case "bash":
      return "write"
  }
}

export function sandboxToolSnapshot(): RunToolSnapshotTool[] {
  return sandboxTools.map((tool) => ({
    ...nativeToolSnapshot({
      access: tool.access,
      route: tool.route,
      tool: tool.name,
    }),
  }))
}
