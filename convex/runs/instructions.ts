import { type ToolPermission } from "../permissions/catalog"
import { type RuntimeToolCapability } from "./tools/types"

export function createAvailableToolsInstructions(
  capabilities: RuntimeToolCapability[]
) {
  const toolLines =
    capabilities.length === 0
      ? ["- None."]
      : capabilities.map(
          (capability) =>
            `- ${capability.label}: ${formatToolLabels(capability.tools)}.`
        )

  return [
    "# Available Tools",
    "",
    "Use and describe only the Milo tools listed below for this run. These tools come from active connected integrations and enabled Milo capabilities.",
    "If asked what tools are available, answer from this list only. Do not claim access to disconnected integrations or host/runtime capabilities that are not listed here.",
    "",
    ...toolLines,
  ].join("\n")
}

export function createToolApprovalInstructions(
  promptedTools: ToolPermission[]
) {
  return [
    "# Tool Approval",
    "",
    "The following tools require explicit user approval before use:",
    "",
    ...promptedTools.map((tool) => `- ${tool.tool}: ${tool.description}`),
    "",
    "When you need one of these tools, describe the exact action you want to take, ask for approval, and stop. Do not call the tool in the same turn.",
    "If the current user message clearly approves a previously requested action, call only the approved tool with the approved arguments.",
  ].join("\n")
}

function formatToolLabels(labels: string[]) {
  if (labels.length === 0) {
    return "no enabled tools"
  }

  return labels.join(", ")
}
