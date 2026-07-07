import { type PlaybookCapability } from "../../contracts/playbooks/capabilities"
import { type PromptTemplateId, promptTemplates } from "../../prompts/generated"
import { renderPromptTemplate } from "../../prompts/render"

export type PlaybookRecipient = { email: string; name?: string }

const instructionTemplates: Record<string, PromptTemplateId> = {
  "follow-up-sweep": "playbooks/sweep",
  "meeting-prep": "playbooks/prep",
  "morning-brief": "playbooks/brief",
  "week-in-review": "playbooks/review",
}

/** Render a playbook's instruction template with resolved provider labels. */
export function renderPlaybookInstructions(args: {
  key: string
  providers: Record<PlaybookCapability, string>
  recipient: PlaybookRecipient
}): string {
  const templateId = instructionTemplates[args.key]

  if (templateId === undefined) {
    throw new Error(`No instruction template for playbook: ${args.key}`)
  }

  return renderPromptTemplate(promptTemplates[templateId], {
    providers: args.providers,
    recipient: recipientLine(args.recipient),
  })
}

function recipientLine(recipient: PlaybookRecipient) {
  return recipient.name === undefined
    ? recipient.email
    : `${recipient.name} <${recipient.email}>`
}
