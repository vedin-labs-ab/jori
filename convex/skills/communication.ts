import { promptTemplates } from "../prompts/generated"
import { renderPromptTemplate } from "../prompts/render"
import { type Integration } from "../shared/integrations"
import { getRuntimeSkillForIntegration, type RuntimeSkill } from "./runtime"

export type CommunicationCapability = "files" | "interactive" | "rich" | "text"
export type CommunicationProfile = "agent-final-reply"

type CapabilityMap = {
  default: readonly CommunicationCapability[]
} & Partial<Record<Integration, readonly CommunicationCapability[]>>

type ProfileDefinition = {
  capabilities: CapabilityMap
}

export type CommunicationGuidance = {
  body: string
  skill: RuntimeSkill | null
}

const profiles = {
  "agent-final-reply": {
    capabilities: { default: ["text"], slack: ["text", "rich"] },
  },
} as const satisfies Record<CommunicationProfile, ProfileDefinition>

export function createCommunicationGuidance(args: {
  integration: Integration
  profile: CommunicationProfile
  skills: readonly RuntimeSkill[]
}): CommunicationGuidance {
  const skill = getRuntimeSkillForIntegration(args.skills, args.integration)
  const profile = profiles[args.profile]

  return {
    body: renderPromptTemplate(promptTemplates["communication/message"], {
      communication: {
        guidance:
          skill === null
            ? ""
            : createGuidanceBlock(
                skill,
                capabilitiesFor(profile.capabilities, args.integration)
              ),
      },
    }).trim(),
    skill,
  }
}

function capabilitiesFor(map: CapabilityMap, integration: Integration) {
  return map[integration] ?? map.default
}

function createGuidanceBlock(
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
    : renderPromptTemplate(promptTemplates["communication/guidance"], {
        guidance: {
          parts: parts.join("\n\n"),
        },
      }).trim()
}

function formatPart(body?: string) {
  return body === undefined ? [] : [body]
}

function runtimeSkillCommunication(skill: RuntimeSkill) {
  return "communication" in skill ? skill.communication : undefined
}
