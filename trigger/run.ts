import { optionalString } from "./input"
import { type ToolRuntime } from "./tool"
import { type JsonObject } from "./types"

export function executeRunTool(
  runtime: ToolRuntime,
  args: {
    input: JsonObject
    name: string
  }
) {
  if (args.name === "finish_run") {
    return finishRun(runtime, args.input)
  }

  throw new Error(`Unknown run tool: ${args.name}`)
}

function finishRun(runtime: ToolRuntime, input: JsonObject) {
  const reason = optionalString(input.reason)
  const replied = runtime.context.activeSurface?.replySent ?? false

  if (
    runtime.context.activeSurface !== null &&
    !replied &&
    reason === undefined
  ) {
    throw new Error("finish_run requires reason when no reply was sent.")
  }

  return {
    finished: true,
    value: {
      reason: reason ?? null,
      replied,
      status: "finished",
    },
  }
}
