import { type JsonObject } from "../../contracts/json"
import { optionalString } from "../input"
import { type AgentRuntime } from "../runtime"

const maxResultLength = 8000

/** The one run-routed tool: the agent's own signal that the run is done. */
export function finishRun(runtime: AgentRuntime, input: JsonObject) {
  const reason = optionalString(input.reason)
  const result = optionalString(input.result)
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

  if (result !== undefined && result.length > maxResultLength) {
    throw new Error(
      `finish_run result must be at most ${maxResultLength} characters; return a concise summary.`
    )
  }

  if (result !== undefined) {
    runtime.context.result = result
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
