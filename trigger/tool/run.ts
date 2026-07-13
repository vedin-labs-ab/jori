import { type JsonObject } from "../../contracts/json"
import { optionalString } from "../input"
import { type ToolRuntime } from "./runtime"

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
  const communicated = runtime.context.activeSurface?.communicated ?? false

  if (
    runtime.context.activeSurface !== null &&
    !communicated &&
    reason === undefined
  ) {
    throw new Error(
      "finish_run requires reason when no visible communication was sent."
    )
  }

  return {
    finished: true,
    value: {
      communicated,
      reason: reason ?? null,
      status: "finished",
    },
  }
}
