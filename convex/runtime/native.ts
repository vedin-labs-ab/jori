import {
  type CodingToolName,
  codingToolDefinitions,
} from "../../contracts/coding"
import { type JsonObject } from "../../contracts/json"
import { type ToolAccess } from "../../contracts/permissions"
import { durationUnits } from "../../contracts/runtime/duration"
import {
  maxAgentWaitRuns,
  maxRunResultLength,
} from "../../contracts/runtime/tools"
import {
  stringArrayProperty,
  withOptionalFieldGuidance,
} from "../../contracts/tools"
import { nativeToolUsage } from "./permissions/native"

type RunLifecycleTool = {
  access: ToolAccess
  description: string
  inputSchema: JsonObject
  name: "finish_run"
  route: "run"
}

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
          "Integration and web tool names the agent may use, exact names from your own tools. Omit to pass on your full access. Grant the smallest set that covers the task; names outside your own access are dropped. Core Jori tools are always included."
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
      required: ["runIds"],
      properties: {
        runIds: {
          ...stringArrayProperty(
            "Run IDs returned by start_agent. Include 1-20 direct child agents."
          ),
          minItems: 1,
          maxItems: maxAgentWaitRuns,
          items: { type: "string", minLength: 1, pattern: "\\S" },
        },
        timeout: {
          type: "object",
          additionalProperties: false,
          required: ["unit", "value"],
          description:
            "Maximum wait before resuming with whatever is terminal. Defaults to 15 minutes.",
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
  {
    access: "write" as const,
    name: "stop_agent",
    description: nativeToolUsage("stop_agent", "agent"),
    inputSchema: withOptionalFieldGuidance({
      type: "object",
      additionalProperties: false,
      required: ["runId"],
      properties: {
        runId: {
          type: "string",
          description: "Run ID of a direct child returned by start_agent.",
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

/** The one tool every run has: how the agent says its work is done. */
export function runLifecycleTools(): RunLifecycleTool[] {
  return [
    {
      access: "write",
      description: nativeToolUsage("finish_run", "run"),
      inputSchema: withOptionalFieldGuidance(finishRunSchema()),
      name: "finish_run",
      route: "run",
    },
  ]
}

function finishRunSchema(): JsonObject {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      reason: {
        type: "string",
        description:
          "Internal reason for finishing. Required when this run has an active requester surface and no visible communication was sent.",
      },
      result: {
        type: "string",
        maxLength: maxRunResultLength,
        description:
          "Outcome returned to the run that delegated this one; the parent receives it from wait_for_agents. Keep it a concise, self-contained summary (max 8,000 characters).",
      },
    },
  }
}
