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
    "When one is needed, call `request_tool_approval` with provider, tool, exact args, summary, and handoff { objective, progress, next }.",
    "`request_tool_approval` sends the user-facing approval request and code.",
    "Do not send a normal message asking for approval; without `request_tool_approval`, there is no code and no approval.",
    "After `request_tool_approval` succeeds, stop. Do not call the prompted tool directly.",
    "If you are continuing after an approval, use the approved tool result in the prompt and continue from the handoff.",
  ].join("\n")
}
