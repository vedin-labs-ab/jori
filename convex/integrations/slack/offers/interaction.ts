import { v } from "convex/values"
import { isRecord } from "../../../../contracts/json"
import { internal } from "../../../_generated/api"
import { type Id } from "../../../_generated/dataModel"
import { type ActionCtx, internalMutation } from "../../../_generated/server"
import { actorValidator, createIntegrationActor } from "../../../shared/actor"
import { markIntegrationOfferCancelled } from "../../offers/transition"
import { getSlackActorProfile } from "../directory/users"
import { readFirstAction, readNestedString } from "../ingress/actions"

export const integrationOfferOpenActionId = "jori_integration_offer_open"
export const integrationOfferCancelActionId = "jori_integration_offer_cancel"

type SlackIntegrationOfferCancelInteraction = {
  accountId: string
  actorId?: string
  channelId: string
  messageTs: string
  integrationOfferId: Id<"integrationOffers">
}

export async function handleSlackIntegrationOfferInteraction(
  ctx: ActionCtx,
  payload: unknown,
  expectedConnectionGeneration?: number
) {
  const cancel = parseSlackIntegrationOfferCancelInteraction(payload)

  if (cancel !== null) {
    const actor = await createSlackIntegrationOfferActor(ctx, cancel)

    await ctx.runMutation(
      internal.integrations.slack.offers.interaction.cancel,
      {
        accountId: cancel.accountId,
        ...(actor === undefined ? {} : { actor }),
        channelId: cancel.channelId,
        messageTs: cancel.messageTs,
        integrationOfferId: cancel.integrationOfferId,
        expectedConnectionGeneration,
      }
    )
    return true
  }

  return isSlackIntegrationOfferInteraction(payload)
}

export const cancel = internalMutation({
  args: {
    accountId: v.string(),
    expectedConnectionGeneration: v.optional(v.number()),
    actor: v.optional(actorValidator),
    channelId: v.string(),
    messageTs: v.string(),
    integrationOfferId: v.id("integrationOffers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const offer = await ctx.db.get(args.integrationOfferId)

    if (offer === null) {
      return null
    }

    const delivery = offer.delivery

    if (
      delivery === undefined ||
      delivery.data.channelId !== args.channelId ||
      delivery.data.messageTs !== args.messageTs
    ) {
      return null
    }

    const integration = await ctx.db.get(delivery.integrationId)

    if (
      integration === null ||
      integration.integration !== "slack" ||
      integration.externalId !== args.accountId ||
      integration.status !== "active" ||
      (args.expectedConnectionGeneration !== undefined &&
        (integration.connectionGeneration ?? 0) !==
          args.expectedConnectionGeneration)
    ) {
      return null
    }

    await markIntegrationOfferCancelled(ctx, offer, {
      actor: args.actor,
      now: Date.now(),
    })

    return null
  },
})

export function isSlackIntegrationOfferInteraction(payload: unknown) {
  return readActionIds(payload).includes(integrationOfferOpenActionId)
}

export function parseSlackIntegrationOfferCancelInteraction(payload: unknown) {
  if (!isRecord(payload) || payload.type !== "block_actions") {
    return null
  }

  const action = readFirstAction(payload.actions)

  if (action?.action_id !== integrationOfferCancelActionId) {
    return null
  }

  const accountId = readNestedString(payload.team, "id")
  const actorId = readNestedString(payload.user, "id")
  const channelId = readNestedString(payload.channel, "id")
  const messageTs = readNestedString(payload.message, "ts")
  const integrationOfferId = readIntegrationOfferId(action.value)

  if (
    accountId === null ||
    channelId === null ||
    messageTs === null ||
    integrationOfferId === null
  ) {
    return null
  }

  return {
    accountId,
    ...(actorId === null ? {} : { actorId }),
    channelId,
    messageTs,
    integrationOfferId,
  } satisfies SlackIntegrationOfferCancelInteraction
}

async function createSlackIntegrationOfferActor(
  ctx: ActionCtx,
  interaction: SlackIntegrationOfferCancelInteraction
) {
  const profile = await getSlackActorProfile(ctx, {
    accountId: interaction.accountId,
    actorId: interaction.actorId,
  })

  return createIntegrationActor({ externalId: interaction.actorId, ...profile })
}

function readActionIds(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return []
  }

  const actions = (payload as { actions?: unknown }).actions

  if (!Array.isArray(actions)) {
    return []
  }

  return actions.flatMap((action) => {
    if (typeof action !== "object" || action === null) {
      return []
    }

    const actionId = (action as { action_id?: unknown }).action_id

    return typeof actionId === "string" ? [actionId] : []
  })
}

function readIntegrationOfferId(value: unknown) {
  if (typeof value !== "string" || value === "") {
    return null
  }

  try {
    const parsed = JSON.parse(value) as unknown

    return isRecord(parsed) && typeof parsed.integrationOfferId === "string"
      ? (parsed.integrationOfferId as Id<"integrationOffers">)
      : null
  } catch {
    return null
  }
}
