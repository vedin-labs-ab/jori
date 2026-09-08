import { type JsonObject } from "../../../contracts/json"
import { maxRunResultLength } from "../../../contracts/runtime/tools"
import { optionalString } from "../../shared/input"
import { type AgentRuntime } from "../platform"

/** The one run-routed tool: the agent's own signal that the run is done.
 *  The outcome is stored on the run itself, so the parent reads it back
 *  from there rather than from this turn's state. */
export async function finishRun(runtime: AgentRuntime, input: JsonObject) {
  const reason = optionalString(input.reason)
  const result = optionalString(input.result)
  const surface = runtime.context.activeSurface
  const communicated = surface?.communicated ?? false

  // A message on an integration may warrant no reply — one not meant for
  // Jori, say — given a reason. A message in the chat is always for Jori,
  // so ending it silently leaves the person looking at nothing.
  if (surface !== null && !communicated) {
    if (surface.surface === "console") {
      throw new Error(
        "Every message in the chat gets a reply: call send_reply before finish_run."
      )
    }

    if (reason === undefined) {
      throw new Error(
        "finish_run requires reason when no visible communication was sent."
      )
    }
  }

  if (result !== undefined && result.length > maxRunResultLength) {
    throw new Error(
      `finish_run result must be at most ${maxRunResultLength} characters; return a concise summary.`
    )
  }

  if (result !== undefined) {
    await runtime.platform.finishRun({ result })
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
