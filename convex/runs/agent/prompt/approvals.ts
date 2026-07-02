import { promptTemplates } from "../../../../prompts/generated"
import { renderPromptTemplate } from "../../../../prompts/render"
import { type ToolPermission } from "../../../permissions/catalog"

export function createApprovalInstructions(promptedTools: ToolPermission[]) {
  if (promptedTools.length === 0) {
    return ""
  }

  return renderPromptTemplate(promptTemplates["approval/request"], {
    tools: {
      names: promptedTools.map((tool) => `\`${tool.tool}\``).join(", "),
    },
  })
}
