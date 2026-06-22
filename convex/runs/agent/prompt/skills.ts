import { promptTemplates } from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import { listRuntimeSkills } from "../../../skills/runtime"

export function createSkillInstructions(args: {
  omittedNames: ReadonlySet<string>
}) {
  const available = listAvailableSkills(args.omittedNames)

  if (available.length === 0) {
    return ""
  }

  return renderPromptTemplate(promptTemplates["skills/discovery"], {
    skills: {
      available: formatAvailableSkills(available),
    },
  })
}

function listAvailableSkills(omittedNames: ReadonlySet<string>) {
  return listRuntimeSkills().filter((skill) => !omittedNames.has(skill.name))
}

function formatAvailableSkills(
  available: ReturnType<typeof listRuntimeSkills>
) {
  return available
    .map((skill) => `- \`${skill.name}\`: ${skill.description}`)
    .join("\n")
}
