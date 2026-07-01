import { promptTemplates } from "../../../../prompts/generated"
import { renderPromptTemplate } from "../../../../prompts/render"
import { type ToolPermission } from "../../../permissions/catalog"

export function createToolApprovalInstructions(
  promptedTools: ToolPermission[]
) {
  return renderPromptTemplate(promptTemplates["approval/request"], {
    tools: {
      names: promptedTools.map((tool) => `\`${tool.tool}\``).join(", "),
    },
  })
}
