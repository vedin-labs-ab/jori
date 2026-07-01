import { type JsonObject } from "../../../contracts/json"
import { finalProperty, toolFinalDescription } from "../../../contracts/runtime"
import { type MessageIntegration } from "../../runs/agent/input"
import { withOptionalFieldGuidance } from "../../runs/agent/tools/schemas"
import { type RunToolSnapshotTool } from "../../runs/agent/tools/snapshot"

export type ActiveSurfaceTool = {
  access: "write"
  description: string
  inputSchema: JsonObject
  name: "add_reaction" | "send_reply"
  route: "surface"
}

export function activeSurfaceTools(
  surface: MessageIntegration
): ActiveSurfaceTool[] {
  return [sendReplyTool(surface), addReactionTool(surface)]
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

function sendReplyTool(surface: MessageIntegration): ActiveSurfaceTool {
  return {
    access: "write",
    description: `Send a visible reply or update to the active requester surface. Milo routes it to the current requester context by default. ${toolFinalDescription} On Linear, set commentId only when intentionally replying under a specific visible comment.`,
    inputSchema: withOptionalFieldGuidance(sendReplySchema(surface)),
    name: "send_reply",
    route: "surface",
  }
}

function addReactionTool(surface: MessageIntegration): ActiveSurfaceTool {
  return {
    access: "write",
    description: `Add a visible reaction on the active requester surface. ${toolFinalDescription}`,
    inputSchema: withOptionalFieldGuidance(addReactionSchema(surface)),
    name: "add_reaction",
    route: "surface",
  }
}

function sendReplySchema(surface: MessageIntegration): JsonObject {
  const properties: Record<string, JsonObject> = {
    text: {
      type: "string",
      description: "Visible reply or update text for the requester.",
    },
    final: finalProperty(),
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
        "Optional Linear comment UUID to reply under. Use the value after a visible linear:comment: identifier, or linear:thread: when continuing that existing comment thread. Omit to reply in the current Linear context.",
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
    required: ["reaction", "target"],
    properties: {
      final: finalProperty(),
      reaction: reactionProperty(surface),
      target: reactionTargetProperty(surface),
    },
  }
}

function reactionProperty(surface: MessageIntegration): JsonObject {
  if (surface === "github") {
    return {
      type: "string",
      enum: [
        "+1",
        "-1",
        "laugh",
        "confused",
        "heart",
        "hooray",
        "rocket",
        "eyes",
      ],
      description: "GitHub reaction keyword.",
    }
  }

  return {
    type: "string",
    description:
      surface === "slack"
        ? "Slack emoji name without surrounding colons, for example thumbsup or white_check_mark. Custom emoji names are allowed."
        : "Linear emoji reaction value, for example a thumbs-up or check mark emoji.",
  }
}

function reactionTargetProperty(surface: MessageIntegration): JsonObject {
  if (surface === "slack") {
    return slackReactionTarget()
  }

  if (surface === "linear") {
    return linearReactionTarget()
  }

  return githubReactionTarget()
}

function slackReactionTarget(): JsonObject {
  return {
    type: "object",
    additionalProperties: false,
    required: ["messageTs"],
    description: "Slack message to react to in the active conversation.",
    properties: {
      messageTs: {
        type: "string",
        description:
          "Slack message timestamp. Use the value after a visible slack:message: identifier.",
      },
    },
  }
}

function linearReactionTarget(): JsonObject {
  return {
    description: "Linear issue or comment to react to.",
    oneOf: [
      {
        type: "object",
        additionalProperties: false,
        required: ["type", "commentId"],
        properties: {
          type: { const: "comment", description: "React to a comment." },
          commentId: {
            type: "string",
            description:
              "Linear comment UUID. Use the value after a visible linear:comment: identifier.",
          },
        },
      },
      {
        type: "object",
        additionalProperties: false,
        required: ["type", "issueId"],
        properties: {
          type: { const: "issue", description: "React to the issue." },
          issueId: {
            type: "string",
            description:
              "Linear issue UUID. Use the value after a visible linear:issue: identifier.",
          },
        },
      },
    ],
  }
}

function githubReactionTarget(): JsonObject {
  return {
    type: "object",
    additionalProperties: false,
    required: ["type", "commentId"],
    description: "GitHub comment to react to.",
    properties: {
      type: { const: "comment", description: "React to a comment." },
      commentId: {
        type: "number",
        minimum: 1,
        description:
          "Numeric GitHub comment ID. Use the value after a visible github:comment: identifier.",
      },
    },
  }
}

function activeSurfaceToolLabel(name: ActiveSurfaceTool["name"]) {
  return name === "send_reply" ? "Send reply" : "Add reaction"
}
