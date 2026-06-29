import {
  type CodingToolName,
  codingToolDefinitions,
} from "../../contracts/coding"
import { type ToolAccess } from "../../contracts/permissions"
import { type RunToolSnapshotTool } from "../runs/agent/tools/snapshot"

export const sandboxTools = [
  ...codingToolDefinitions.map((tool) => ({
    ...tool,
    access: codingToolAccess(tool.name),
    route: "sandbox" as const,
  })),
  {
    access: "write" as const,
    name: "start_agent",
    description: "Start a Milo agent run for a delegated task.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["task"],
      properties: {
        task: { type: "string" },
        title: { type: "string" },
      },
    },
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
    access: tool.access,
    description: tool.description,
    label: toolLabel(tool.name),
    tool: tool.name,
  }))
}

function toolLabel(name: string) {
  const [first = "", ...rest] = name.split("_")

  return [capitalize(first), ...rest].join(" ")
}

function capitalize(value: string) {
  return value === "" ? value : value[0].toUpperCase() + value.slice(1)
}
