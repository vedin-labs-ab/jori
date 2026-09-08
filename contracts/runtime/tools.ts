import { type JsonObject } from "../json"

export const maxAgentWaitRuns = 20
export const maxRunResultLength = 8000

export const toolFinalDescription =
  "Set true only when this tool call is the final useful action for the run. If active approvals or integration offers remain, the run waits; otherwise it completes after the tool succeeds."

const runtimeToolMetadataKinds = [
  "filter",
  "outcome",
  "scope",
  "target",
] as const

type RuntimeToolMetadataKind = (typeof runtimeToolMetadataKinds)[number]

export type RuntimeToolMetadataItem = {
  kind: RuntimeToolMetadataKind
  text: string
}

export function finalProperty(): JsonObject {
  return {
    type: "boolean",
    description: toolFinalDescription,
  }
}

export function readFinal(input: JsonObject) {
  const value = input.final

  if (value === undefined || value === null) {
    return false
  }

  if (typeof value !== "boolean") {
    throw new Error("final must be a boolean")
  }

  return value
}
