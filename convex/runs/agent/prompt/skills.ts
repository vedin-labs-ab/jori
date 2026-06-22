import { promptTemplates } from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import { listRuntimeSkills } from "../../../skills/runtime"

export function createSkillInstructions(args: {
  omittedNames: ReadonlySet<string>
}) {
  return renderPromptTemplate(promptTemplates["skills/discovery"], {
    skills: {
      available: formatAvailableSkills(args.omittedNames),
    },
  })
}

function formatAvailableSkills(omittedNames: ReadonlySet<string>) {
  const available = listRuntimeSkills().filter(
    (skill) => !omittedNames.has(skill.name)
  )

  if (available.length === 0) {
    return "- None"
  }

  return available
    .map((skill) => `- \`${skill.name}\`: ${skill.description}`)
    .join("\n")
}
