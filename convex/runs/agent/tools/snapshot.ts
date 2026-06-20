import { type Infer } from "convex/values"
import { type toolSnapshot } from "../../schema"
import { type RuntimeToolCapability } from "./types"

export type RunToolSnapshot = Infer<typeof toolSnapshot>

export function createRunToolSnapshot(input: {
  capabilities: RuntimeToolCapability[]
  webSearch: boolean
}): RunToolSnapshot {
  return {
    groups: input.capabilities.map((capability) => ({
      surface: capability.surface,
      label: capability.label,
      tools: capability.tools,
    })),
    webSearch: input.webSearch,
  }
}
