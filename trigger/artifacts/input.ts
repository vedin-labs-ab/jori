import { isArtifactPublishTool } from "../../contracts/artifacts/publish"
import { requiredString } from "../input"
import { type ToolRuntime } from "../tool"
import { type JsonObject } from "../types"

export async function prepareMiloToolInput(
  runtime: ToolRuntime,
  tool: string,
  input: JsonObject
) {
  if (!isArtifactPublishTool(tool)) {
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
