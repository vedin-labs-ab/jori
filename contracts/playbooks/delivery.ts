import { type Integration, integrationLabels } from "../integrations"

// Where a playbook sends its output. A first-class concept, separate from the
// input capabilities a playbook reads: internals stay generic over the kinds,
// and per-provider specifics (tool names, phrasing) live only in this module.

const deliveryKinds = ["email", "slack"] as const
export type DeliveryKind = (typeof deliveryKinds)[number]

/** Integrations that can send email. */
export const emailDeliveryProviders = ["gmail", "microsoftEmail"] as const
export type EmailDeliveryProvider = (typeof emailDeliveryProviders)[number]

/** Integrations backing a delivery — the subset that can emit output. */
export type DeliveryIntegration = EmailDeliveryProvider | "slack"

export function isEmailDeliveryProvider(
  integration: Integration
): integration is EmailDeliveryProvider {
  return (emailDeliveryProviders as readonly Integration[]).includes(
    integration
  )
}

export type SlackDeliveryTarget =
  | { kind: "channel"; id: string; label: string }
  | { kind: "dm"; id: string; label: string }

/** What the user picked; the target self-email needs no explicit address. */
export type DeliveryChoice =
  | { kind: "email" }
  | { kind: "slack"; target: SlackDeliveryTarget }

/** A fully resolved destination: what instructions and tool grants derive from. */
export type DeliveryDestination =
  | { kind: "email"; integration: EmailDeliveryProvider; address: string }
  | { kind: "slack"; target: SlackDeliveryTarget }

/** Per-playbook delivery contract: the default, the offered kinds, and the
 *  noun the instruction uses for the produced output ("brief", "summary"). */
export type PlaybookDelivery = {
  default: DeliveryKind
  allowed: readonly DeliveryKind[]
  noun: string
  /** "content" sends the full output in the message (the default);
   *  "summary" sends a short digest plus a link to the full output. */
  style?: DeliveryStyle
}

export type DeliveryStyle = "content" | "summary"

/** The integrations that satisfy each delivery kind (the connection edge). */
export const deliveryKindProviders = {
  email: emailDeliveryProviders,
  slack: ["slack"],
} satisfies Record<DeliveryKind, readonly Integration[]>

// The only per-provider send-tool code; everything else is generic.
const deliverySendTools = {
  gmail: ["google_gmail_send_message"],
  microsoftEmail: ["microsoft_email_send_message"],
  slack: ["conversations_add_message"],
} satisfies Record<DeliveryIntegration, readonly string[]>

export function destinationIntegration(
  destination: DeliveryDestination
): DeliveryIntegration {
  return destination.kind === "email" ? destination.integration : "slack"
}

export function destinationTools(destination: DeliveryDestination): string[] {
  return [...deliverySendTools[destinationIntegration(destination)]]
}

/** The final instruction paragraph, composed from the resolved destination. */
export function deliveryInstruction(args: {
  destination: DeliveryDestination
  subject: string
  noun: string
  style?: DeliveryStyle
}): string {
  const { destination, noun, subject } = args
  const summary = args.style === "summary"
  const closing = "Unless there is nothing to send."

  if (destination.kind === "email") {
    const route = `from my @${integrationLabels[destination.integration]} to ${destination.address}`

    return summary
      ? `Email a short summary of the ${noun} ${route} with the subject "${subject}" plus what it covers, and include the link to the full ${noun}. ${closing}`
      : `Email the ${noun} ${route} with the subject "${subject}" plus today's date. ${closing}`
  }

  const target = destination.target

  if (target.kind === "channel") {
    const route = `to the "${target.label}" Slack channel using channel ID ${target.id} via @Slack`

    return summary
      ? `Post a short summary of the ${noun} ${route}, with the link to the full ${noun}. ${closing}`
      : `Post the ${noun} ${route}. ${closing}`
  }

  const route = `to ${target.label} in a Slack DM using user ID ${target.id} via @Slack`

  return summary
    ? `Send a short summary of the ${noun} ${route}, with the link to the full ${noun}. ${closing}`
    : `Send the ${noun} ${route}. ${closing}`
}
