import { type JsonObject } from "../../contracts/json"
import { type SurfaceReactionTarget } from "../../contracts/runtime/surface"
import { readFinal } from "../../contracts/runtime/tools"
import { optionalString, requiredString } from "../input"
import { type AgentRuntime } from "../runtime"

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
    runId: runtime.context.run.id,
    text: requiredString(input.text, "text"),
    ...(target === null ? {} : { target }),
  })

  activeSurface.communicated = true
  activeSurface.target = explicitTarget ?? activeSurface.target

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
    throw new Error("blocks must be an array of Block Kit block objects")
  }

  return value.length === 0 ? undefined : value
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
  const reaction = requiredString(value, "reaction")

  if (surface === "github" && !githubReactions.has(reaction)) {
    throw new Error(
      `reaction must be one of ${[...githubReactions].join(", ")}`
    )
  }

  return reaction
}

function requiredReactionTarget(
  value: unknown,
  surface: string
): SurfaceReactionTarget {
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

const githubReactions = new Set([
  "+1",
  "-1",
  "laugh",
  "confused",
  "heart",
  "hooray",
  "rocket",
  "eyes",
])
