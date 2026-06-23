import { type JsonObject } from "../../../contracts/json"
import { type MessageIntegration } from "../../runs/agent/input"
import { type RunToolSnapshotTool } from "../../runs/agent/tools/snapshot"

export type ActiveSurfaceTool = {
  access: "write"
  description: string
  inputSchema: JsonObject
  name: "finish_run" | "send_reply"
  route: "active_surface"
}

export function activeSurfaceTools(
  surface: MessageIntegration
): ActiveSurfaceTool[] {
  return [
    {
      access: "write",
      description:
        "Send a visible reply or update to the active requester surface. Milo routes it to the current Slack thread, GitHub conversation, or Linear issue; do not include routing fields.",
      inputSchema: sendReplySchema(surface),
      name: "send_reply",
      route: "active_surface",
    },
    {
      access: "write",
      description:
        "Finish this active-surface run. If no send_reply was sent in this run, include reason explaining why no visible reply is warranted. The reason is internal and is not shown to the requester.",
      inputSchema: finishRunSchema(),
      name: "finish_run",
      route: "active_surface",
    },
  ]
}

export function activeSurfaceToolSnapshot(
  tools: ActiveSurfaceTool[]
): RunToolSnapshotTool[] {
  return tools.map((tool) => ({
    access: tool.access,
    description: tool.description,
    label: activeSurfaceToolLabel(tool.name),
    tool: tool.name,
  }))
}

function activeSurfaceToolLabel(name: ActiveSurfaceTool["name"]) {
  if (name === "send_reply") {
    return "Send reply"
  }

  return "Finish run"
}

function sendReplySchema(surface: MessageIntegration): JsonObject {
  const properties: Record<string, JsonObject> = {
    text: {
      type: "string",
      description: "Visible reply or update text for the requester.",
    },
  }

  if (surface === "slack") {
    properties.blocks = {
      type: "array",
      description:
        "Optional Slack Block Kit blocks. Always include concise fallback text.",
      items: { type: "object", additionalProperties: true },
    }
  }

  return {
    type: "object",
    additionalProperties: false,
    required: ["text"],
    properties,
  }
}

function finishRunSchema(): JsonObject {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      reason: {
        type: "string",
        description:
          "Internal reason for finishing without a visible reply. Required when no send_reply was sent in this run.",
      },
    },
  }
}
