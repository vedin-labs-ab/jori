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
  "Format messages so they feel native: direct, compact, and easy to scan."

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
    "# Communication",
    "",
    `Destination: \`${integrationLabels[args.integration]}\``,
    "",
    nativeMessageGuidance,
    ...formatSkillParts(skill, capabilities),
  ].join("\n")
}

function capabilitiesFor(map: CapabilityMap, integration: Integration) {
  return map[integration] ?? map.default
}

function formatSkillParts(
  skill: RuntimeSkill,
  capabilities: readonly CommunicationCapability[]
) {
  const communication = skill.communication

  if (communication === undefined) {
    return []
  }

  const supportedParts: Partial<Record<CommunicationCapability, string>> =
    communication.parts
  return capabilities.flatMap((capability) =>
    formatPart(capability, supportedParts[capability])
  )
}

function formatPart(capability: CommunicationCapability, body?: string) {
  return body === undefined
    ? []
    : ["", [`## ${formatCapabilityTitle(capability)}`, body].join("\n\n")]
}

function formatCapabilityTitle(capability: CommunicationCapability) {
  if (capability === "text") {
    return "Format"
  }

  if (capability === "rich") {
    return "Rich Messages"
  }

  if (capability === "interactive") {
    return "Interactive Controls"
  }

  return "Files"
}
