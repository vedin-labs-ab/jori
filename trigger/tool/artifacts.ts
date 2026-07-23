import { isArtifactPublishTool } from "../../contracts/artifacts/publish"
import { type JsonObject } from "../../contracts/json"
import { requiredString } from "../input"
import { type AgentRuntime } from "../runtime"

export async function prepareMiloToolInput(
  runtime: AgentRuntime,
  tool: string,
  input: JsonObject
) {
  // Template instantiation carries no workspace: the backend resolves the
  // template's source, build, and contract itself.
  if (!isArtifactPublishTool(tool) || typeof input.template === "string") {
    return input
  }

  const artifact = await runtime.sandbox.buildArtifact(
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
    build: artifact.build,
    contract: artifact.contract,
    source: artifact.source,
  }
}
