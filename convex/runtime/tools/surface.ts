import { type JsonObject } from "../../../contracts/json"
import { readReplyParts } from "../../../contracts/replies/validate"
import { type SurfaceReactionTarget } from "../../../contracts/runtime/surface"
import { readFinal } from "../../../contracts/runtime/tools"
import {
  githubReactionContents,
  isGitHubReactionContent,
} from "../../../contracts/tools/fragments/reactions"
import { replyPartKinds } from "../../messages/capabilities"
import { optionalString, requiredString } from "../../shared/input"
import {
  type MessageSurface,
  messageSurfaceLabel,
} from "../../shared/integrations"
import { type AgentRuntime } from "../platform/types"

export async function executeActiveSurfaceTool(
  runtime: AgentRuntime,
  args: {
    input: JsonObject
    name: string
  }
) {
  if (args.name === "send_reply") {
    return await sendActiveReply(runtime, args.input)
  }

  if (args.name === "add_reaction") {
    return await addActiveReaction(runtime, args.input)
  }

  throw new Error(`Unknown active surface tool: ${args.name}`)
}

async function sendActiveReply(runtime: AgentRuntime, input: JsonObject) {
  const finished = readFinal(input)
  const activeSurface = requireActiveSurface(runtime)
  const explicitTarget = optionalReplyTarget(input, activeSurface.surface)
  const target = explicitTarget ?? activeSurface.target

  const result = await runtime.platform.sendReply({
    blocks: optionalBlocks(input.blocks),
    parts: optionalReplyParts(input.parts, activeSurface.surface),
    runId: runtime.context.run.id,
    text: requiredString(input.text, "text"),
    ...(target === null ? {} : { target }),
  })

  activeSurface.communicated = true

  // An explicit target moves the conversation, so the session follows it and
  // later turns reply where this one did.
  if (explicitTarget !== undefined) {
    activeSurface.target = explicitTarget
    await runtime.platform.retarget({ target: explicitTarget })
  }

  return {
    finished,
    value: result,
  }
}

async function addActiveReaction(runtime: AgentRuntime, input: JsonObject) {
  const finished = readFinal(input)
  const activeSurface = requireActiveSurface(runtime)
  const result = await runtime.platform.addReaction({
    reaction: requiredReaction(input.reaction, activeSurface.surface),
    runId: runtime.context.run.id,
    target: requiredReactionTarget(input.target, activeSurface.surface),
  })

  activeSurface.communicated = true

  return {
    finished,
    value: result,
  }
}

function optionalReplyTarget(input: JsonObject, surface: string) {
  const commentId = optionalString(input.commentId)

  if (input.commentId !== undefined && input.commentId !== null) {
    if (commentId === undefined) {
      throw new Error("commentId must be a non-empty string")
    }

    if (surface !== "linear") {
      throw new Error("commentId is only supported on Linear")
    }
  }

  return commentId === undefined ? undefined : `linear:thread:${commentId}`
}

function optionalBlocks(value: unknown) {
  if (value === undefined || value === null) {
    return undefined
  }

  if (!Array.isArray(value) || !value.every(isJsonObject)) {
    throw new Error("blocks must be an array of objects")
  }

  return value.length === 0 ? undefined : value
}

/** Parts are checked against the surface's own contract here, so a
 *  malformed part comes back to the model as this call's error. */
function optionalReplyParts(value: unknown, surface: MessageSurface) {
  if (value === undefined || value === null) {
    return undefined
  }

  const kinds = replyPartKinds(surface)

  if (kinds.length === 0) {
    throw new Error(
      `parts are not available on ${messageSurfaceLabel(surface)}`
    )
  }

  const parts = readReplyParts(value, kinds)

  return parts.length === 0 ? undefined : parts
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function requireActiveSurface(runtime: AgentRuntime) {
  const activeSurface = runtime.context.activeSurface

  if (activeSurface === null) {
    throw new Error("Run has no active surface.")
  }

  return activeSurface
}

function requiredReaction(value: unknown, surface: string) {
  if (surface === "console") {
    throw new Error("Reactions are not available in the console.")
  }

  const reaction = requiredString(value, "reaction")

  if (surface === "github" && !isGitHubReactionContent(reaction)) {
    throw new Error(
      `reaction must be one of ${githubReactionContents.join(", ")}`
    )
  }

  return reaction
}

function requiredReactionTarget(
  value: unknown,
  surface: string
): SurfaceReactionTarget {
  if (surface === "console") {
    throw new Error("Reactions are not available in the console.")
  }

  const target = requiredObject(value, "target")

  if (surface === "slack") {
    return { messageTs: requiredString(target.messageTs, "target.messageTs") }
  }

  if (surface === "linear") {
    return linearReactionTarget(target)
  }

  if (surface === "github") {
    return githubReactionTarget(target)
  }

  throw new Error(`Unsupported reaction surface: ${surface}`)
}

function linearReactionTarget(target: JsonObject): SurfaceReactionTarget {
  if (target.type === "issue") {
    return {
      type: "issue",
      issueId: requiredString(target.issueId, "target.issueId"),
    }
  }

  if (target.type === "comment") {
    return {
      type: "comment",
      commentId: requiredString(target.commentId, "target.commentId"),
    }
  }

  throw new Error("target.type must be issue or comment")
}

function githubReactionTarget(target: JsonObject): SurfaceReactionTarget {
  if (target.type !== "comment") {
    throw new Error("target.type must be comment")
  }

  return {
    type: "comment",
    commentId: requiredPositiveInteger(target.commentId, "target.commentId"),
  }
}

function requiredObject(value: unknown, name: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`)
  }

  return value as JsonObject
}

function requiredPositiveInteger(value: unknown, name: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`)
  }

  return value
}
