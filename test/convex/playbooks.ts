import { getPlaybook } from "../../contracts/playbooks/catalog"
import { type DeliveryDestination } from "../../contracts/playbooks/delivery"
import {
  type PlaybookOptionValues,
  resolvePlaybookOptions,
} from "../../contracts/playbooks/options"
import { renderPlaybookInstructions } from "../../convex/playbooks/instructions"

export const emailDestination = {
  kind: "email",
  integration: "gmail",
  address: "Sam Doe <sam@example.com>",
} as const satisfies DeliveryDestination

export function renderPlaybook(
  key: string,
  destination: DeliveryDestination = emailDestination,
  options: PlaybookOptionValues = {}
) {
  const definition = getPlaybook(key)

  return renderPlaybookInstructions({
    definition,
    providers: { email: "Gmail", calendar: "Google Calendar" },
    destination,
    options: resolvePlaybookOptions(definition.setup, options),
  })
}
