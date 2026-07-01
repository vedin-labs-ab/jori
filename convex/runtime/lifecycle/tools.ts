import { type JsonObject } from "../../../contracts/json"
import { type ToolAccess } from "../../../contracts/permissions"
import { withOptionalFieldGuidance } from "../../runs/agent/tools/schemas"

export type RunLifecycleTool = {
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
      description:
        "Finish this agentic run. If this run has an active requester surface and no visible communication was sent, include reason explaining why none is warranted. The reason is internal and is not shown to the requester.",
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
    },
  }
}
