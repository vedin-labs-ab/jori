import {
  type CodingToolName,
  codingToolDefinitions,
} from "../../contracts/coding"
import { type ToolAccess } from "../../contracts/permissions"
import { durationUnits } from "../../contracts/runtime"
import {
  stringArrayProperty,
  withOptionalFieldGuidance,
} from "../runs/agent/tools/schemas"
import { nativeToolUsage } from "./permissions/native"

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
      required: ["task", "title"],
      properties: {
        task: {
          type: "string",
          description: "Complete instructions for the delegated work.",
        },
        title: {
          type: "string",
          description: "Concise title that identifies the delegated work.",
        },
        tools: stringArrayProperty(
          "Integration and web tool names the agent may use, exact names from your own tools. Omit to pass on your full access. Grant the smallest set that covers the task; names outside your own access are dropped. Core Milo tools are always included."
        ),
      },
    }),
    route: "agent",
  },
  {
    access: "read" as const,
    name: "wait_for_agents",
    description: nativeToolUsage("wait_for_agents", "agent"),
    inputSchema: withOptionalFieldGuidance({
      type: "object",
      additionalProperties: false,
      required: ["runIds", "timeout"],
      properties: {
        runIds: stringArrayProperty(
          "Run IDs returned by start_agent. Include 1-20 direct child agents."
        ),
        timeout: {
          type: "object",
          additionalProperties: false,
          required: ["unit", "value"],
          properties: {
            unit: {
              type: "string",
              enum: [...durationUnits],
              description: "Unit for the maximum wait.",
            },
            value: {
              type: "integer",
              minimum: 1,
              description:
                "Positive whole-number wait. The total timeout must be between 5 seconds and 30 days.",
            },
          },
        },
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
