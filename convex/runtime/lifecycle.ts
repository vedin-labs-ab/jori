import { type JsonObject } from "../../contracts/json"
import { type ToolAccess } from "../../contracts/permissions"
import { withOptionalFieldGuidance } from "../runs/agent/tools/schemas"
import { nativeToolUsage } from "./permissions/native"

type RunLifecycleTool = {
  access: ToolAccess
  description: string
  inputSchema: JsonObject
  name: "finish_run"
  route: "run"
}

export function runLifecycleTools(): RunLifecycleTool[] {
  return [
    {
      access: "write",
      description: nativeToolUsage("finish_run", "run"),
      inputSchema: withOptionalFieldGuidance(finishRunSchema()),
      name: "finish_run",
      route: "run",
    },
  ]
}

function finishRunSchema(): JsonObject {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      reason: {
        type: "string",
        description:
          "Internal reason for finishing. Required when this run has an active requester surface and no visible communication was sent.",
      },
      result: {
        type: "string",
        description:
          "Outcome returned to the run that delegated this one; the parent receives it from wait_for_agents. Keep it a concise, self-contained summary (max 8,000 characters).",
      },
    },
  }
}
