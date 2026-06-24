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

const profiles = {
  "agent-final-reply": {
    capabilities: { default: ["text"], slack: ["text", "rich"] },
  },
} as const satisfies Record<CommunicationProfile, ProfileDefinition>

export function createCommunicationGuidance(args: {
  integration: Integration
  profile: CommunicationProfile
}) {
  const skill = getRuntimeSkillForIntegration(args.integration)

  if (skill === null) {
    return null
  }

  const profile = profiles[args.profile]
  const capabilities = capabilitiesFor(profile.capabilities, args.integration)

  return {
    body: renderPromptTemplate(promptTemplates["communication/message"], {
      communication: {
        guidance: createGuidanceBlock(skill, capabilities),
      },
    }).trim(),
    skill,
  }
}

export type CommunicationGuidance = NonNullable<
  ReturnType<typeof createCommunicationGuidance>
>

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
