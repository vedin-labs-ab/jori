import { type JsonObject, toJsonObject } from "../../../contracts/json"
import { replyPartsSchema } from "../../../contracts/replies/validate"
import { finalProperty } from "../../../contracts/runtime/tools"
import { withOptionalFieldGuidance } from "../../../contracts/tools"
import { githubReactionContentProperty } from "../../../contracts/tools/fragments/reactions"
import {
  communicationCapabilities,
  replyPartKinds,
} from "../../messages/capabilities"
import {
  type MessageIntegration,
  type MessageSurface,
  messageIntegrations,
  messageSurfaceLabel,
  messageSurfaces,
} from "../../shared/integrations"
import { nativeToolUsage } from "../permissions/native"

export type ActiveSurfaceTool = {
  access: "write"
  description: string
  inputSchema: JsonObject
  name: "add_reaction" | "send_reply"
  route: "surface"
}

/** Every surface replies; only providers carry reactions. */
export function activeSurfaceTools(
  surface: MessageSurface
): ActiveSurfaceTool[] {
  return surface === "console"
    ? [sendReplyTool(surface)]
    : [sendReplyTool(surface), addReactionTool(surface)]
}

/** Request schemas for the schema viewer, built from the same per-surface
 *  builders the runtime serves: one labeled variant per message surface. */
export function activeSurfaceToolReferenceSchemas(): Record<
  string,
  JsonObject
> {
  return {
    send_reply: surfaceToolVariants(messageSurfaces, sendReplySchema),
    add_reaction: surfaceToolVariants(messageIntegrations, addReactionSchema),
  }
}

function surfaceToolVariants<Surface extends MessageSurface>(
  surfaces: readonly Surface[],
  build: (surface: Surface) => JsonObject
): JsonObject {
  return {
    description:
      "The request shape follows the surface the run is replying on.",
    oneOf: surfaces.map((surface) => ({
      title: messageSurfaceLabel(surface),
      ...withOptionalFieldGuidance(build(surface)),
    })),
  }
}

function sendReplyTool(surface: MessageSurface): ActiveSurfaceTool {
  return {
    access: "write",
    description: nativeToolUsage("send_reply", "surface"),
    inputSchema: withOptionalFieldGuidance(sendReplySchema(surface)),
    name: "send_reply",
    route: "surface",
  }
}

function addReactionTool(surface: MessageIntegration): ActiveSurfaceTool {
  return {
    access: "write",
    description: nativeToolUsage("add_reaction", "surface"),
    inputSchema: withOptionalFieldGuidance(addReactionSchema(surface)),
    name: "add_reaction",
    route: "surface",
  }
}

/** The reply request: text first, then what the surface's capabilities let
 *  the reply carry, then any addressing the surface needs. */
function sendReplySchema(surface: MessageSurface): JsonObject {
  const capabilities = communicationCapabilities(surface)
  const kinds = replyPartKinds(surface)
  const properties: Record<string, JsonObject> = {
    text: {
      type: "string",
      description: "Visible reply or update text for the requester.",
    },
    final: finalProperty(),
  }

  if (capabilities.includes("blocks")) {
    properties.blocks = {
      type: "array",
      description:
        "Optional Slack Block Kit blocks. Always include concise fallback text.",
      items: { type: "object", additionalProperties: true },
    }
  }

  if (kinds.length > 0) {
    properties.parts = toJsonObject(replyPartsSchema(kinds))
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
    return githubReactionContentProperty("GitHub reaction keyword.")
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
