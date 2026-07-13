import { type PlaybookCapability } from "../../contracts/playbooks/capabilities"
import {
  allowsDeliveryChoice,
  type DeliveryChoice,
  type DeliveryDestination,
  type EmailDeliveryProvider,
  emailDeliveryProviders,
  isEmailDeliveryProvider,
  type PlaybookDelivery,
} from "../../contracts/playbooks/delivery"
import { type Id } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { type Integration } from "../shared/integrations"

export type PlaybookRecipient = { email?: string; name?: string }

type ResolvedSlot = {
  slot: { capability: PlaybookCapability }
  integration: Integration
}

/** Turn the user's pick into a fully specified destination. */
export async function resolveDestination(
  ctx: QueryLikeCtx,
  choice: DeliveryChoice,
  args: {
    connected: Set<Integration>
    createdBy: Id<"persons">
    delivery: PlaybookDelivery
    emailProvider: EmailDeliveryProvider | undefined
    recipient: PlaybookRecipient
  }
): Promise<DeliveryDestination> {
  if (!allowsDeliveryChoice(args.delivery, choice)) {
    throw new Error("Choose an available delivery destination.")
  }

  if (choice.kind === "email") {
    return {
      kind: "email",
      integration: args.emailProvider ?? soleConnectedEmail(args.connected),
      address: recipientLine(args.recipient),
    }
  }

  if (!args.connected.has("slack")) {
    throw new Error("Connect Slack to deliver through Slack.")
  }

  if (choice.target.kind === "dm") {
    const target = await readSelfSlackTarget(
      ctx,
      args.createdBy,
      args.recipient.name
    )

    if (target === undefined) {
      throw new Error("Link your Slack identity to deliver by Slack DM.")
    }

    return { kind: "slack", target }
  }

  return { kind: "slack", target: normalizeSlackChannel(choice.target) }
}

export async function readSelfSlackTarget(
  ctx: QueryLikeCtx,
  personId: Id<"persons">,
  fallbackName: string | undefined
) {
  const identities = await ctx.db
    .query("identities")
    .withIndex("by_person", (query) => query.eq("personId", personId))
    .take(100)
  const slack = identities.filter((identity) => identity.provider === "slack")

  if (slack.length !== 1) {
    return undefined
  }

  return {
    kind: "dm" as const,
    id: slack[0].externalId,
    label: slack[0].name ?? fallbackName ?? "you",
  }
}

export function normalizeSlackChannel(
  target: Extract<DeliveryChoice, { kind: "slack" }>["target"] & {
    kind: "channel"
  }
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
  if (recipient.email === undefined) {
    throw new Error(
      "Your account needs an email address before playbooks can email you."
    )
  }

  return recipient.name === undefined
    ? recipient.email
    : `${recipient.name} <${recipient.email}>`
}
