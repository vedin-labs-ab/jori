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
      "Send a visible reply or update to the active requester surface. Milo routes it to the current requester context by default. On Linear, set commentId only when intentionally replying under a specific visible comment.",
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
    properties.commentId = {
      type: "string",
      description:
        "Optional Linear comment UUID to reply under. Use the value after linear:comment: or linear:thread: in identifiers=[...]. Omit to reply in the current Linear context.",
    }
  }

  return {
    type: "object",
    additionalProperties: false,
    required: ["text"],
    properties,
  }
}
