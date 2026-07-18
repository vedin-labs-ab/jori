import { type PlaybookCapability } from "../../../contracts/playbooks/capabilities"
import { type PlaybookDefinition } from "../../../contracts/playbooks/catalog"
import {
  type DeliveryDestination,
  deliveryInstruction,
} from "../../../contracts/playbooks/delivery"
import { type PlaybookOptionValues } from "../../../contracts/playbooks/options"
import {
  type PromptTemplateId,
  promptTemplates,
} from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"

/** Render a playbook's template with resolved input providers and a
 *  destination; everything else the render needs lives on the definition. */
export function renderPlaybookInstructions(args: {
  definition: PlaybookDefinition
  providers: Record<PlaybookCapability, string>
  destination: DeliveryDestination
  options?: PlaybookOptionValues
}): string {
  const { definition } = args
  const template = promptTemplates[definition.template as PromptTemplateId]

  if (template === undefined) {
    throw new Error(`Unknown playbook template: ${definition.template}`)
  }

  return renderPromptTemplate(template, {
    providers: args.providers,
    options: args.options ?? {},
    delivery: deliveryInstruction({
      destination: args.destination,
      subject: definition.title,
      noun: definition.delivery.noun,
      style: definition.delivery.style,
    }),
  })
}
