import { playbookCatalog } from "../../contracts/playbooks/catalog"
import { type DeliveryDestination } from "../../contracts/playbooks/delivery"
import {
  type PlaybookOptionValues,
  resolvePlaybookOptions,
} from "../../contracts/playbooks/options"
import { renderPlaybookInstructions } from "./instructions"

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
  const definition = playbookCatalog.find((entry) => entry.key === key)

  return renderPlaybookInstructions({
    key,
    providers: { email: "Gmail", calendar: "Google Calendar" },
    providerKeys: { email: "gmail", calendar: "googleCalendar" },
    destination,
    subject: definition?.title ?? key,
    noun: definition?.delivery.noun ?? "output",
    style: definition?.delivery.style,
    options: resolvePlaybookOptions(definition?.options, options),
    agentWait: definition?.agentWait,
  })
}
