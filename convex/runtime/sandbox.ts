import {
  type CodingToolName,
  codingToolDefinitions,
} from "../../contracts/coding"
import { type ToolAccess } from "../../contracts/permissions"

export const sandboxTools = [
  ...codingToolDefinitions.map((tool) => ({
    ...tool,
    access: codingToolAccess(tool.name),
    route: "sandbox" as const,
  })),
  {
    access: "write" as const,
    name: "spawn_subagent",
    description: "Start a child Milo agent run for a delegated task.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["task"],
      properties: {
        task: { type: "string" },
        title: { type: "string" },
      },
    },
    route: "subagent",
  },
] as const

function codingToolAccess(name: CodingToolName): ToolAccess {
  switch (name) {
    case "glob":
    case "grep":
    case "read":
      return "read"
    case "apply_patch":
    case "bash":
      return "write"
  }
}
