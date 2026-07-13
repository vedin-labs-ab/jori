import { type PlaybookCapability } from "../../../contracts/playbooks/capabilities"
import {
  type DeliveryDestination,
  type DeliveryStyle,
  deliveryInstruction,
} from "../../../contracts/playbooks/delivery"
import { type PlaybookOptionValues } from "../../../contracts/playbooks/options"
import { type Duration } from "../../../contracts/runtime"
import {
  type PromptTemplateId,
  promptTemplates,
} from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import { type Integration } from "../../shared/integrations"

const instructionTemplates: Record<string, PromptTemplateId> = {
  "follow-up-sweep": "playbooks/sweep",
  "meeting-briefing": "playbooks/briefing",
  "morning-brief": "playbooks/brief",
  "week-in-review": "playbooks/review",
}

/** Render a playbook's template with resolved input providers and a destination. */
export function renderPlaybookInstructions(args: {
  key: string
  providers: Record<PlaybookCapability, string>
  providerKeys: Partial<Record<PlaybookCapability, Integration>>
  destination: DeliveryDestination
  subject: string
  noun: string
  style?: DeliveryStyle
  options?: PlaybookOptionValues
  agentWait?: Duration
}): string {
  const templateId = instructionTemplates[args.key]

  if (templateId === undefined) {
    throw new Error(`No instruction template for playbook: ${args.key}`)
  }

  return renderPromptTemplate(promptTemplates[templateId], {
    providers: args.providers,
    providerKeys: args.providerKeys,
    options: args.options ?? {},
    agentWait: args.agentWait ?? null,
    delivery: deliveryInstruction({
      destination: args.destination,
      subject: args.subject,
      noun: args.noun,
      style: args.style,
    }),
  })
}
