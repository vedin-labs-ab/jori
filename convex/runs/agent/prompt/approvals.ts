import { type ToolPermission } from "../../../../contracts/permissions"
import { promptTemplates } from "../../../../prompts/generated"
import { renderPromptTemplate } from "../../../../prompts/render"

export function createApprovalInstructions(promptedTools: ToolPermission[]) {
  if (promptedTools.length === 0) {
    return ""
  }

  return renderPromptTemplate(promptTemplates["agent/instructions/approval"], {
    tools: {
      names: promptedTools.map((tool) => `\`${tool.tool}\``).join(", "),
    },
  })
}
