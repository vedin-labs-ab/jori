import { type ToolPermission } from "../permissions/catalog"

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
