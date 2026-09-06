import { type SkillSurface } from "../../contracts/skills"
import { promptTemplates } from "../../prompts/generated"
import { renderPromptTemplate } from "../../prompts/render"
import { getRuntimeSkillForSurface, type RuntimeSkill } from "./runtime"

type CommunicationCapability = "files" | "interactive" | "rich" | "text"
type CommunicationProfile = "agent-final-reply"

type CapabilityMap = {
  default: readonly CommunicationCapability[]
} & Partial<Record<SkillSurface, readonly CommunicationCapability[]>>

type ProfileDefinition = {
  capabilities: CapabilityMap
}

export type CommunicationGuidance = {
  communication: string
  format: string
  skill: RuntimeSkill | null
}

const profiles = {
  "agent-final-reply": {
    capabilities: {
      default: ["text"],
      console: ["text", "rich", "interactive"],
      slack: ["text", "rich"],
    },
  },
} as const satisfies Record<CommunicationProfile, ProfileDefinition>

export function createCommunicationGuidance(args: {
  surface: SkillSurface
  profile: CommunicationProfile
  skills: readonly RuntimeSkill[]
}): CommunicationGuidance {
  const skill = getRuntimeSkillForSurface(args.skills, args.surface)
  const profile = profiles[args.profile]

  return {
    communication: renderPromptTemplate(
      promptTemplates["agent/instructions/communication"],
      {}
    ),
    format:
      skill === null
        ? ""
        : createFormatBlock(
            skill,
            capabilitiesFor(profile.capabilities, args.surface)
          ),
    skill,
  }
}

function capabilitiesFor(map: CapabilityMap, surface: SkillSurface) {
  return map[surface] ?? map.default
}

function createFormatBlock(
  skill: RuntimeSkill,
  capabilities: readonly CommunicationCapability[]
) {
  const communication = runtimeSkillCommunication(skill)

  if (communication === undefined) {
    return ""
  }

  const supportedParts: Partial<Record<CommunicationCapability, string>> =
    communication.parts
  const parts = capabilities.flatMap((capability) =>
    formatPart(supportedParts[capability])
  )

  return parts.length === 0
    ? ""
    : renderPromptTemplate(promptTemplates["agent/instructions/format"], {
        format: {
          parts: parts.join("\n\n"),
        },
      })
}

function formatPart(body?: string) {
  return body === undefined ? [] : [body]
}

function runtimeSkillCommunication(skill: RuntimeSkill) {
  return "communication" in skill ? skill.communication : undefined
}
