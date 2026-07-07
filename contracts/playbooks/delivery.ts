import { type Integration, integrationLabels } from "../integrations"

// Where a playbook sends its output. A first-class concept, separate from the
// input capabilities a playbook reads: internals stay generic over the kinds,
// and per-provider specifics (tool names, phrasing) live only in this module.

export const deliveryKinds = ["email", "slack"] as const
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

/** What the user picked; the target self-email needs no explicit address. */
export type DeliveryChoice =
  | { kind: "email" }
  | { kind: "slack"; channelId: string; channelName: string }

/** A fully resolved destination: what instructions and tool grants derive from. */
export type DeliveryDestination =
  | { kind: "email"; integration: EmailDeliveryProvider; address: string }
  | { kind: "slack"; channelId: string; channelName: string }

/** Per-playbook delivery contract: the default, the offered kinds, and the
 *  noun the instruction uses for the produced output ("brief", "summary"). */
export type PlaybookDelivery = {
  default: DeliveryKind
  allowed: readonly DeliveryKind[]
  noun: string
}

export const deliveryKindLabels = {
  email: "Email",
  slack: "Slack",
} satisfies Record<DeliveryKind, string>

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
}): string {
  const { destination, noun, subject } = args

  if (destination.kind === "email") {
    return `Email the ${noun} from my ${integrationLabels[destination.integration]} to ${destination.address} with the subject "${subject}" plus today's date. Unless there is nothing to send.`
  }

  return `Post the ${noun} to #${destination.channelName} via Slack. Unless there is nothing to send.`
}
