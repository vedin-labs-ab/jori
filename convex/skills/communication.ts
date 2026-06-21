import { type Integration, integrationLabels } from "../shared/integrations"
import { getRuntimeSkillForIntegration, type RuntimeSkill } from "./runtime"

export type CommunicationCapability = "files" | "interactive" | "rich" | "text"
export type CommunicationProfile = "agent-final-reply" | "routing-message"

type CapabilityMap = {
  default: readonly CommunicationCapability[]
} & Partial<Record<Integration, readonly CommunicationCapability[]>>

type ProfileDefinition = {
  capabilities: CapabilityMap
}

const nativeMessageGuidance =
  "Format the reply so it feels native: direct, compact, and easy to scan."

const profiles = {
  "agent-final-reply": {
    capabilities: { default: ["text"] },
  },
  "routing-message": {
    capabilities: { default: ["text"] },
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

  return [
    "## Communication",
    "",
    nativeMessageGuidance,
    "",
    `Surface: \`${integrationLabels[args.integration]}\``,
    ...formatGuidance(skill, capabilities),
  ].join("\n")
}

function capabilitiesFor(map: CapabilityMap, integration: Integration) {
  return map[integration] ?? map.default
}

function formatGuidance(
  skill: RuntimeSkill,
  capabilities: readonly CommunicationCapability[]
) {
  const communication = skill.communication

  if (communication === undefined) {
    return []
  }

  const supportedParts: Partial<Record<CommunicationCapability, string>> =
    communication.parts
  const parts = capabilities.flatMap((capability) =>
    formatPart(supportedParts[capability])
  )

  return parts.length === 0 ? [] : ["", "Guidance:", "", parts.join("\n")]
}

function formatPart(body?: string) {
  return body === undefined ? [] : [body]
}
