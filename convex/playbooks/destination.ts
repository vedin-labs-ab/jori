import { type PlaybookCapability } from "../../contracts/playbooks/capabilities"
import {
  type DeliveryChoice,
  type DeliveryDestination,
  type EmailDeliveryProvider,
  emailDeliveryProviders,
  isEmailDeliveryProvider,
} from "../../contracts/playbooks/delivery"
import { type Integration } from "../shared/integrations"

export type PlaybookRecipient = { email: string; name?: string }

type ResolvedSlot = {
  slot: { capability: PlaybookCapability }
  integration: Integration
}

/** Turn the user's pick into a fully specified destination. */
export function resolveDestination(
  choice: DeliveryChoice,
  ctx: {
    connected: Set<Integration>
    emailProvider: EmailDeliveryProvider | undefined
    recipient: PlaybookRecipient
  }
): DeliveryDestination {
  if (choice.kind === "email") {
    return {
      kind: "email",
      integration: ctx.emailProvider ?? soleConnectedEmail(ctx.connected),
      address: recipientLine(ctx.recipient),
    }
  }

  if (!ctx.connected.has("slack")) {
    throw new Error("Connect Slack to deliver through Slack.")
  }

  return {
    kind: "slack",
    target: normalizeSlackTarget(choice.target),
  }
}

function normalizeSlackTarget(
  target: Extract<DeliveryChoice, { kind: "slack" }>["target"]
) {
  const id = target.id.trim()
  const label = target.label.trim().replace(/\s+/g, " ")

  if (id === "" || /\s/.test(id) || label === "") {
    throw new Error("Choose a valid Slack destination.")
  }

  return { ...target, id, label }
}

/** A playbook delivers by email through the same account it reads from. */
export function emailInputProvider(
  resolved: ResolvedSlot[]
): EmailDeliveryProvider | undefined {
  const integration = resolved.find(
    (entry) => entry.slot.capability === "email"
  )?.integration

  return integration !== undefined && isEmailDeliveryProvider(integration)
    ? integration
    : undefined
}

function soleConnectedEmail(
  connected: Set<Integration>
): EmailDeliveryProvider {
  const providers = emailDeliveryProviders.filter((provider) =>
    connected.has(provider)
  )

  if (providers.length !== 1) {
    throw new Error("Connect an email account to deliver by email.")
  }

  return providers[0]
}

function recipientLine(recipient: PlaybookRecipient) {
  return recipient.name === undefined
    ? recipient.email
    : `${recipient.name} <${recipient.email}>`
}
