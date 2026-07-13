import { isRecord } from "../../../contracts/json"
import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { createIntegrationActor } from "../../shared/actor"
import { getSlackActorProfile } from "../slack/directory/users"
import { readFirstAction, readNestedString } from "../slack/ingress/actions"

export const integrationOfferOpenActionId = "milo_integration_offer_open"
export const integrationOfferCancelActionId = "milo_integration_offer_cancel"

export type SlackIntegrationOfferCancelInteraction = {
  accountId: string
  actorId?: string
  channelId: string
  messageTs: string
  integrationOfferId: Id<"integrationOffers">
}

export async function handleSlackIntegrationOfferInteraction(
  ctx: ActionCtx,
  payload: unknown
) {
  const cancel = parseSlackIntegrationOfferCancelInteraction(payload)

  if (cancel !== null) {
    const actor = await createSlackIntegrationOfferActor(ctx, cancel)

    await ctx.runMutation(internal.integrations.offers.lifecycle.cancel, {
      accountId: cancel.accountId,
      ...(actor === undefined ? {} : { actor }),
      channelId: cancel.channelId,
      messageTs: cancel.messageTs,
      integrationOfferId: cancel.integrationOfferId,
    })
    return true
  }

  return isSlackIntegrationOfferInteraction(payload)
}

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

  return createIntegrationActor({
    externalId: interaction.actorId,
    email: profile?.email,
    name: profile?.name,
  })
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
