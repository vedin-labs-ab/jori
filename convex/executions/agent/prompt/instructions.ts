import { type ToolPermission } from "../../../permissions/catalog"
import { promptTemplates } from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"

export function createToolApprovalInstructions(
  promptedTools: ToolPermission[]
) {
  return renderPromptTemplate(promptTemplates["approval/request"], {
    tools: {
      names: promptedTools.map((tool) => tool.tool).join(", "),
    },
  })
}
