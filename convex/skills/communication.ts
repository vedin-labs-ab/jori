import { promptTemplates } from "../../prompts/generated"
import { renderPromptTemplate } from "../../prompts/render"
import {
  type CommunicationGuidance,
  communicationGuidance,
} from "../messages/capabilities"
import { type MessageSurface } from "../shared/integrations"
import { getRuntimeSkillForSurface, type RuntimeSkill } from "./runtime"

export type CommunicationInstructions = {
  communication: string
  format: string
  skill: RuntimeSkill | null
}

/** How to reply on a surface: the surface-agnostic communication rules,
 *  and a format block read from the surface's skill for exactly the
 *  guidance its reply capabilities call for. */
export function createCommunicationGuidance(args: {
  surface: MessageSurface
  skills: readonly RuntimeSkill[]
}): CommunicationInstructions {
  const skill = getRuntimeSkillForSurface(args.skills, args.surface)

  return {
    communication: renderPromptTemplate(
      promptTemplates["agent/instructions/communication"],
      {}
    ),
    format:
      skill === null
        ? ""
        : createFormatBlock(skill, communicationGuidance(args.surface)),
    skill,
  }
}

function createFormatBlock(
  skill: RuntimeSkill,
  guidance: readonly CommunicationGuidance[]
) {
  const parts: Partial<Record<CommunicationGuidance, string>> =
    skill.communication?.parts ?? {}
  const bodies = guidance.flatMap((part) => {
    const body = parts[part]

    return body === undefined ? [] : [body]
  })

  return bodies.length === 0
    ? ""
    : renderPromptTemplate(promptTemplates["agent/instructions/format"], {
        format: {
          parts: bodies.join("\n\n"),
        },
      })
}
