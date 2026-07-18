import { compactRecord } from "../../contracts/json"
import { type PlaybookDefinition } from "../../contracts/playbooks/catalog"
import {
  allowsDeliveryMode,
  type DeliveryChoice,
  type DeliveryMode,
  type DeliveryOption,
  type DeliverySetup,
  deliveryMode,
  deliveryModes,
  emailDeliveryProviders,
} from "../../contracts/playbooks/delivery"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { type QueryLikeCtx } from "../shared/context"
import { type Integration } from "../shared/integrations"
import {
  normalizeSlackChannel,
  type PlaybookRecipient,
  readSelfSlackTarget,
} from "./destination"

export type DeliveryContext = {
  connected: Set<Integration>
  hasSlackIdentity: boolean
  preference?: DeliveryChoice
  recipient: PlaybookRecipient
}

export async function readDeliveryContext(
  ctx: QueryLikeCtx,
  args: {
    connected: Set<Integration>
    ownerId: Id<"persons"> | undefined
    recipient: PlaybookRecipient
    tenantId: string
  }
): Promise<DeliveryContext> {
  const [preference, slackTarget] = await Promise.all([
    readDeliveryPreference(ctx, args),
    args.ownerId === undefined
      ? undefined
      : readSelfSlackTarget(ctx, args.ownerId, args.recipient.name),
  ])
  return compactRecord({
    connected: args.connected,
    hasSlackIdentity: slackTarget !== undefined,
    recipient: args.recipient,
    preference,
  })
}

export function deliverySetup(
  definition: PlaybookDefinition,
  context: DeliveryContext
): DeliverySetup {
  const options = deliveryModes
    .filter((mode) => allowsDeliveryMode(definition.delivery, mode))
    .map((mode) => deliveryOption(mode, context))
  const recommended = recommendedDelivery(options, context.preference)

  return compactRecord({
    options,
    recommended,
  })
}

export async function saveDeliveryPreference(
  ctx: MutationCtx,
  args: {
    connected: Set<Integration>
    delivery: DeliveryChoice
    personId: Id<"persons">
    recipient: PlaybookRecipient
    tenantId: string
  }
) {
  const slackTarget = await readSelfSlackTarget(
    ctx,
    args.personId,
    args.recipient.name
  )
  const option = deliveryOption(deliveryMode(args.delivery), {
    connected: args.connected,
    hasSlackIdentity: slackTarget !== undefined,
    recipient: args.recipient,
  })

  if (!option.available) {
    throw new Error(option.reason ?? "Delivery method is unavailable.")
  }

  const delivery = normalizeDeliveryChoice(args.delivery)
  const existing = await ctx.db
    .query("playbookPreferences")
    .withIndex("by_tenant_and_person", (query) =>
      query.eq("tenantId", args.tenantId).eq("personId", args.personId)
    )
    .unique()
  const values = { delivery, updatedAt: Date.now() }

  if (existing === null) {
    await ctx.db.insert("playbookPreferences", {
      tenantId: args.tenantId,
      personId: args.personId,
      ...values,
    })
  } else {
    await ctx.db.patch(existing._id, values)
  }
}

function deliveryOption(
  mode: DeliveryMode,
  context: DeliveryContext
): DeliveryOption {
  if (mode === "email") {
    if (
      !emailDeliveryProviders.some((provider) =>
        context.connected.has(provider)
      )
    ) {
      return { mode, available: false, reason: "Connect an email account" }
    }

    return context.recipient.email === undefined
      ? { mode, available: false, reason: "No email address found" }
      : { mode, available: true }
  }

  if (!context.connected.has("slack")) {
    return { mode, available: false, reason: "Connect Slack" }
  }

  if (mode === "dm" && !context.hasSlackIdentity) {
    return { mode, available: false, reason: "No Slack identity linked" }
  }

  return { mode, available: true }
}

function recommendedDelivery(
  options: DeliveryOption[],
  preference: DeliveryChoice | undefined
) {
  if (preference !== undefined && choiceAvailable(options, preference)) {
    return preference
  }

  if (modeAvailable(options, "dm")) {
    return { kind: "slack", target: { kind: "dm" } } as const
  }

  return modeAvailable(options, "email")
    ? ({ kind: "email" } as const)
    : undefined
}

function choiceAvailable(options: DeliveryOption[], choice: DeliveryChoice) {
  return modeAvailable(options, deliveryMode(choice))
}

function modeAvailable(options: DeliveryOption[], mode: DeliveryMode) {
  return options.find((option) => option.mode === mode)?.available === true
}

async function readDeliveryPreference(
  ctx: QueryLikeCtx,
  args: { ownerId: Id<"persons"> | undefined; tenantId: string }
) {
  if (args.ownerId === undefined) {
    return undefined
  }

  const ownerId = args.ownerId
  const preference = await ctx.db
    .query("playbookPreferences")
    .withIndex("by_tenant_and_person", (query) =>
      query.eq("tenantId", args.tenantId).eq("personId", ownerId)
    )
    .unique()

  return preference?.delivery
}

function normalizeDeliveryChoice(choice: DeliveryChoice): DeliveryChoice {
  if (choice.kind === "email" || choice.target.kind === "dm") {
    return choice
  }

  return { kind: "slack", target: normalizeSlackChannel(choice.target) }
}
