import { type Integration, integrationLabels } from "../shared/integrations"
import {
  formatRuntimeSkillTitle,
  getRuntimeSkillForIntegration,
  type RuntimeSkill,
} from "./runtime"

export type CommunicationCapability = "files" | "interactive" | "rich" | "text"
export type CommunicationProfile = "agent-final-reply" | "routing-message"

type CommunicationContract = "final-reply-text" | "routing-message-text"
type CapabilityMap = {
  default: readonly CommunicationCapability[]
} & Partial<Record<Integration, readonly CommunicationCapability[]>>

type ProfileDefinition = {
  capabilities: CapabilityMap
  contract: CommunicationContract
}

const profiles = {
  "agent-final-reply": {
    capabilities: { default: ["text"] },
    contract: "final-reply-text",
  },
  "routing-message": {
    capabilities: { default: ["text"] },
    contract: "routing-message-text",
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
    `Destination: ${integrationLabels[args.integration]}`,
    "",
    formatSkillParts(skill, capabilities),
    "",
    "Output contract:",
    ...contractLines(profile.contract),
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
    return formatSkillHeader(skill, [])
  }

  const supportedParts: Partial<Record<CommunicationCapability, string>> =
    communication.parts
  const parts = capabilities.flatMap((capability) =>
    formatPart(capability, supportedParts[capability])
  )

  return formatSkillHeader(skill, [communication.overview, ...parts])
}

function formatSkillHeader(skill: RuntimeSkill, sections: string[]) {
  return [`## ${formatRuntimeSkillTitle(skill)}`, ...sections]
    .filter((section) => section.length > 0)
    .join("\n\n")
}

function formatPart(capability: CommunicationCapability, body?: string) {
  return body === undefined
    ? []
    : [[`### ${formatCapabilityTitle(capability)}`, body].join("\n\n")]
}

function contractLines(contract: CommunicationContract) {
  if (contract === "routing-message-text") {
    return [
      "- If route is `respond`, `message` must be one text string.",
      "- Do not emit blocks, attachments, files, buttons, tables, or JSON payloads.",
    ]
  }

  return [
    "- Milo will send your final answer as one text message, not a rich payload.",
    "- Do not emit blocks, attachments, files, buttons, tables, or JSON payloads in the final answer.",
  ]
}

function formatCapabilityTitle(capability: CommunicationCapability) {
  return capability.charAt(0).toUpperCase() + capability.slice(1)
}
