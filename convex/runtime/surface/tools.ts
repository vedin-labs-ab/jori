import { type JsonObject } from "../../../contracts/json"
import { supportsSurfaceReaction } from "../../messages/surface"
import { type MessageIntegration } from "../../runs/agent/input"
import { type RunToolSnapshotTool } from "../../runs/agent/tools/snapshot"

export type ActiveSurfaceTool = {
  access: "write"
  description: string
  inputSchema: JsonObject
  name: "add_reaction" | "send_reply"
  route: "active_surface"
}

export function activeSurfaceTools(
  surface: MessageIntegration
): ActiveSurfaceTool[] {
  return [sendReplyTool(surface), ...reactionTools(surface)]
}

export function supportsActiveSurfaceReaction(surface: MessageIntegration) {
  return supportsSurfaceReaction(surface)
}

export function activeSurfaceToolSnapshot(
  tools: ActiveSurfaceTool[]
): RunToolSnapshotTool[] {
  return tools.map((tool) => ({
    access: tool.access,
    description: tool.description,
    label: activeSurfaceToolLabel(tool),
    tool: tool.name,
  }))
}

function sendReplyTool(surface: MessageIntegration): ActiveSurfaceTool {
  return {
    access: "write",
    description:
      "Send a visible reply or update to the active requester surface. Milo routes it to the current Slack thread, GitHub conversation, or Linear issue; do not include routing fields.",
    inputSchema: sendReplySchema(surface),
    name: "send_reply",
    route: "active_surface",
  }
}

function reactionTools(surface: MessageIntegration): ActiveSurfaceTool[] {
  if (!supportsActiveSurfaceReaction(surface)) {
    return []
  }

  return [
    {
      access: "write",
      description:
        "Add a small visible reaction to the active requester surface. Milo routes it to the current Slack message or Linear target; do not include routing fields.",
      inputSchema: addReactionSchema(surface),
      name: "add_reaction",
      route: "active_surface",
    },
  ]
}

function activeSurfaceToolLabel(tool: ActiveSurfaceTool) {
  if (tool.name === "add_reaction") {
    return "Add reaction"
  }

  return "Send reply"
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

function addReactionSchema(surface: MessageIntegration): JsonObject {
  return {
    type: "object",
    additionalProperties: false,
    required: ["emoji"],
    properties: {
      emoji: {
        type: "string",
        description: reactionEmojiDescription(surface),
      },
    },
  }
}

function reactionEmojiDescription(surface: MessageIntegration) {
  if (surface === "slack") {
    return "Slack emoji name, with or without surrounding colons, for example thumbsup or :eyes:."
  }

  return "Emoji reaction value for the active surface."
}
