import { optionalString, requiredString } from "./input"
import { type ToolRuntime } from "./tool"
import { type JsonObject } from "./types"

export async function executeActiveSurfaceTool(
  runtime: ToolRuntime,
  args: {
    input: JsonObject
    name: string
  }
) {
  if (args.name === "send_reply") {
    return await sendActiveReply(runtime, args.input)
  }

  throw new Error(`Unknown active surface tool: ${args.name}`)
}

async function sendActiveReply(runtime: ToolRuntime, input: JsonObject) {
  const activeSurface = requireActiveSurface(runtime)
  const explicitTarget = optionalReplyTarget(input, activeSurface.surface)
  const target = explicitTarget ?? activeSurface.target

  const result = await runtime.convex.sendReply({
    blocks: optionalBlocks(input.blocks),
    runId: runtime.context.run.id,
    text: requiredString(input.text, "text"),
    ...(target === null ? {} : { target }),
  })

  activeSurface.communicated = true
  activeSurface.target = explicitTarget ?? activeSurface.target

  return {
    finished: false,
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

function requireActiveSurface(runtime: ToolRuntime) {
  const activeSurface = runtime.context.activeSurface

  if (activeSurface === null) {
    throw new Error("Run has no active surface.")
  }

  return activeSurface
}
