import { isAppPublishTool } from "../../contracts/apps/publish"
import { type JsonObject } from "../../contracts/json"
import { requiredString } from "../input"
import { type AgentRuntime } from "../runtime"

export async function prepareJoriToolInput(
  runtime: AgentRuntime,
  tool: string,
  input: JsonObject
) {
  // Template instantiation carries no workspace: the backend resolves the
  // template's source, build, and contract itself.
  if (!isAppPublishTool(tool) || typeof input.template === "string") {
    return input
  }

  const app = await runtime.sandbox.buildApp(
    requiredString(input.workspacePath, "workspacePath")
  )
  const {
    approval: _approval,
    final: _final,
    workspacePath: _workspacePath,
    ...rest
  } = input

  return {
    ...rest,
    build: app.build,
    contract: app.contract,
    source: app.source,
  }
}
