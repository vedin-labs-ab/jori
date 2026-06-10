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
    "Prompted tool schemas include a required `approval` object.",
    "When using a prompted tool, call the actual tool with its normal args plus `approval`.",
    "`approval.summary` should describe the exact action. `approval.handoff` must include { objective, progress, next }.",
    "The tool call sends the user-facing approval request and code. Do not send a normal message asking for approval.",
    "If the tool returns `approval_requested`, stop.",
    "If you are continuing after an approval, use the approved tool result in the prompt and continue from the handoff.",
  ].join("\n")
}
