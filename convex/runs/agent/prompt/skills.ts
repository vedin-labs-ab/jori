import { promptTemplates } from "../../../../prompts/generated"
import { renderPromptTemplate } from "../../../../prompts/render"
import { listRuntimeSkills, type RuntimeSkill } from "../../../skills/runtime"

export function createSkillInstructions(args: {
  omittedNames: ReadonlySet<string>
  skills: readonly RuntimeSkill[]
}) {
  const available = listAvailableSkills(args.skills, args.omittedNames)

  if (available.length === 0) {
    return ""
  }

  return renderPromptTemplate(promptTemplates["skills/discovery"], {
    skills: {
      available: formatAvailableSkills(available),
    },
  })
}

function listAvailableSkills(
  skills: readonly RuntimeSkill[],
  omittedNames: ReadonlySet<string>
) {
  return listRuntimeSkills(skills).filter(
    (skill) => !omittedNames.has(skill.name)
  )
}

function formatAvailableSkills(available: RuntimeSkill[]) {
  return available
    .map((skill) => `- \`${skill.name}\`: ${skill.description}`)
    .join("\n")
}
