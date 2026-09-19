import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { requireOrganizationAccess } from "../../access"
import { readUserProfile } from "../../access/users"
import { ensureCurrentPerson } from "../../persons/account"
import { canSeeRun } from "../../runs/visibility"
import { createPersonActor } from "../../shared/actor"
import {
  createSignedInstallState,
  installPathForIntegration,
} from "../connect/install"
import { markIntegrationOfferExpired } from "./transition"

export async function claimIntegrationOffer(
  ctx: MutationCtx,
  args: { offer: Doc<"integrationOffers">; returnUrl: string }
) {
  const { actor, personId } = await readClaimActor(ctx, args.offer)
  const now = Date.now()

  await requireClaimableOffer(ctx, args.offer, { now, personId })

  if (args.offer.status === "connected") {
    return connectedOfferResult(args.offer)
  }

  await markOfferClaimed(ctx, args.offer, { actor, now, personId })

  return await readyOfferResult(ctx, {
    offer: args.offer,
    returnUrl: args.returnUrl,
  })
}

async function readClaimActor(
  ctx: MutationCtx,
  offer: Doc<"integrationOffers">
) {
  const identity = await requireOrganizationAccess(ctx, offer.organizationId)
  const personId = await ensureCurrentPerson(ctx, offer.organizationId)

  return {
    actor: createPersonActor(personId, readUserProfile(identity)),
    personId,
  }
}

async function requireClaimableOffer(
  ctx: MutationCtx,
  offer: Doc<"integrationOffers">,
  args: { now: number; personId: Doc<"persons">["_id"] }
) {
  if (offer.runId !== undefined) {
    const run = await ctx.db.get(offer.runId)

    if (run === null || !(await canSeeRun(ctx, run, args.personId))) {
      throw new Error("Integration offer not found.")
    }
  }

  if (offer.status === "cancelled") {
    throw new Error("This integration offer was cancelled.")
  }

  if (offer.expiresAt <= args.now && offer.status !== "connected") {
    await markIntegrationOfferExpired(ctx, offer, args.now)
    throw new Error("This integration offer has expired.")
  }

  if (offer.claim !== undefined && offer.claim.personId !== args.personId) {
    throw new Error(
      "This integration offer was already claimed by another person."
    )
  }
}

function connectedOfferResult(offer: Doc<"integrationOffers">) {
  return {
    status: "connected" as const,
    integration: offer.integration,
    ...(offer.result?.integrationId === undefined
      ? {}
      : { integrationId: offer.result.integrationId }),
  }
}

async function markOfferClaimed(
  ctx: MutationCtx,
  offer: Doc<"integrationOffers">,
  args: {
    actor: ReturnType<typeof createPersonActor>
    now: number
    personId: Doc<"persons">["_id"]
  }
) {
  await ctx.db.patch(offer._id, {
    status: "claimed",
    claim:
      offer.claim === undefined
        ? { personId: args.personId, actor: args.actor, at: args.now }
        : { ...offer.claim, actor: offer.claim.actor ?? args.actor },
    result: undefined,
    updatedAt: args.now,
  })
}

async function readyOfferResult(
  ctx: MutationCtx,
  args: { offer: Doc<"integrationOffers">; returnUrl: string }
) {
  const state = await createSignedInstallState(ctx, args.offer.integration, {
    organizationId: args.offer.organizationId,
    returnUrl: args.returnUrl,
    integrationOfferId: args.offer._id,
  })

  return {
    status: "ready" as const,
    integration: args.offer.integration,
    installPath: installPathForIntegration(args.offer.integration),
    state,
    expiresAt: args.offer.expiresAt,
  }
}
