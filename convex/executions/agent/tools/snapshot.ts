import { type Infer } from "convex/values"
import { type toolSnapshot } from "../../schema"
import { type RuntimeToolCapability } from "./types"

export type ExecutionToolSnapshot = Infer<typeof toolSnapshot>

export function createExecutionToolSnapshot(input: {
  capabilities: RuntimeToolCapability[]
  webSearch: boolean
}): ExecutionToolSnapshot {
  return {
    groups: input.capabilities
      .filter((capability) => capability.surface !== "milo")
      .map((capability) => ({
        surface: capability.surface,
        label: capability.label,
        tools: capability.tools,
      })),
    webSearch: input.webSearch,
  }
}
