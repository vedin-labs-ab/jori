import { formatRuntimeSkill, type RuntimeSkill } from "./runtime"

export type CommunicationContract = "final-reply-text" | "routing-message-text"

export function createCommunicationGuidance(args: {
  contract: CommunicationContract
  destination: string
  skill: RuntimeSkill
}) {
  return [
    "# Communication",
    "",
    `Destination: ${args.destination}`,
    "",
    `Loaded communication skill: \`${args.skill.name}\``,
    "",
    formatRuntimeSkill(args.skill),
    "",
    "Output contract:",
    "- This contract narrows the loaded communication skill for this prompt.",
    ...contractLines(args.contract),
  ].join("\n")
}

function contractLines(contract: CommunicationContract) {
  if (contract === "routing-message-text") {
    return [
      "- If you include `message`, it must be a single string.",
      "- Do not emit blocks, attachments, files, buttons, or JSON payloads.",
      "- Apply the loaded communication skill within this text-only contract.",
    ]
  }

  return [
    "- Milo will send your final answer as one text message, not a rich payload.",
    "- Do not emit blocks, attachments, files, buttons, or JSON payloads in the final answer.",
    "- Apply the loaded communication skill within this text-only contract.",
  ]
}
