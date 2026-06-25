import { type JsonObject } from "../../../contracts/json"
import { type MessageIntegration } from "../../runs/agent/input"
import { type RunToolSnapshotTool } from "../../runs/agent/tools/snapshot"

export type ActiveSurfaceTool = {
  access: "write"
  description: string
  inputSchema: JsonObject
  name: "send_reply"
  route: "active_surface"
}

export function activeSurfaceTools(
  surface: MessageIntegration
): ActiveSurfaceTool[] {
  return [sendReplyTool(surface)]
}

export function activeSurfaceToolSnapshot(
  tools: ActiveSurfaceTool[]
): RunToolSnapshotTool[] {
  return tools.map((tool) => ({
    access: tool.access,
    description: tool.description,
    label: "Send reply",
    tool: tool.name,
  }))
}

function sendReplyTool(surface: MessageIntegration): ActiveSurfaceTool {
  return {
    access: "write",
    description:
      "Send a visible reply or update to the active requester surface. Milo routes it to the latest requester message by default. On Linear, set target only when intentionally replying to a different visible issue or comment thread identifier.",
    inputSchema: sendReplySchema(surface),
    name: "send_reply",
    route: "active_surface",
  }
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

  if (surface === "linear") {
    properties.target = {
      type: "string",
      description:
        "Optional Linear reply target from a visible identifiers=[...] list, such as linear:issue:<id> or linear:thread:<comment-id>. Omit to follow the latest requester message.",
    }
  }

  return {
    type: "object",
    additionalProperties: false,
    required: ["text"],
    properties,
  }
}
