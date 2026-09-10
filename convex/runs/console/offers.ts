import { v } from "convex/values"
import { type Doc } from "../../_generated/dataModel"
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
} from "../../_generated/server"
import { requireOrganizationAccess } from "../../access"
import { readUserProfile } from "../../access/users"
import { normalizeConsoleIntegrationOfferReturnUrl } from "../../integrations/offers/helpers"
import {
  claimIntegrationOffer,
  integrationOfferClaimResult,
} from "../../integrations/offers/records"
import { markIntegrationOfferCancelled } from "../../integrations/offers/transition"
import { ensureCurrentPerson } from "../../persons/account"
import { createPersonActor } from "../../shared/actor"
import { integrationLabel } from "../../shared/integrations"
import { canSeeRun } from "../visibility"

const consoleOfferArgs = {
  integrationOfferId: v.id("integrationOffers"),
  runId: v.id("runs"),
  organizationId: v.string(),
}

const cancelResult = v.object({
  status: v.union(
    v.literal("cancelled"),
    v.literal("missing"),
    v.literal("settled")
  ),
})

export const claim = mutation({
  args: {
    ...consoleOfferArgs,
    returnUrl: v.string(),
  },
  returns: integrationOfferClaimResult,
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    const offer = await requireConsoleOffer(ctx, args)

    return await claimIntegrationOffer(ctx, {
      offer,
      returnUrl: normalizeConsoleIntegrationOfferReturnUrl(args.returnUrl),
    })
  },
})

export const cancel = mutation({
  args: consoleOfferArgs,
  returns: cancelResult,
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    const offer = await findConsoleOffer(ctx, args)

    if (offer === null) {
      return { status: "missing" as const }
    }

    if (offer.status !== "pending" && offer.status !== "claimed") {
      return { status: "settled" as const }
    }

    await markIntegrationOfferCancelled(ctx, offer, {
      actor: await readConsoleActor(ctx, args.organizationId),
      reason: "Cancelled from the run page.",
      now: Date.now(),
    })

    return { status: "cancelled" as const }
  },
})

export async function getRunOffers(ctx: QueryCtx, run: Doc<"runs">) {
  const runOffers: Doc<"integrationOffers">[] = []
  const offers = ctx.db
    .query("integrationOffers")
    .withIndex("by_run_and_status", (index) => index.eq("runId", run._id))

  for await (const offer of offers) {
    runOffers.push(offer)
  }

  return runOffers.sort((left, right) => right.createdAt - left.createdAt)
}

export function summarizeRunOffer(offer: Doc<"integrationOffers">) {
  const label = integrationLabel(offer.integration)

  return {
    id: offer._id,
    state: offerState(offer),
    integration: offer.integration,
    integrationLabel: label,
    summary: offer.summary ?? `Jori requested access to ${label}.`,
    expiresAt: offer.expiresAt,
    updatedAt: offer.updatedAt,
    delivery: deliveryLabel(offer.delivery),
    result: offerResult(offer),
  }
}

async function requireConsoleOffer(ctx: MutationCtx, args: ConsoleOfferArgs) {
  const offer = await findConsoleOffer(ctx, args)

  if (offer === null) {
    throw new Error("Integration offer not found.")
  }

  return offer
}

// Callers must authorize organization access before looking up the offer.
async function findConsoleOffer(ctx: MutationCtx, args: ConsoleOfferArgs) {
  const personId = await ensureCurrentPerson(ctx, args.organizationId)
  const run = await ctx.db.get(args.runId)

  if (
    run === null ||
    run.organizationId !== args.organizationId ||
    !(await canSeeRun(ctx, run, personId))
  ) {
    return null
  }

  const offer = await ctx.db.get(args.integrationOfferId)

  return offer?.organizationId === args.organizationId &&
    offer.runId === args.runId
    ? offer
    : null
}

async function readConsoleActor(ctx: MutationCtx, organizationId: string) {
  const identity = await requireOrganizationAccess(ctx, organizationId)
  const personId = await ensureCurrentPerson(ctx, organizationId)

  return createPersonActor(personId, readUserProfile(identity))
}

function offerState(offer: Doc<"integrationOffers">) {
  if (
    (offer.status === "pending" || offer.status === "claimed") &&
    offer.expiresAt <= Date.now()
  ) {
    return "expired" as const
  }

  return offer.status
}

function deliveryLabel(delivery: Doc<"integrationOffers">["delivery"]) {
  return delivery === undefined
    ? undefined
    : `Delivered to ${integrationLabel(delivery.integration)}`
}

function offerResult(offer: Doc<"integrationOffers">) {
  if (offer.result?.error === undefined && offer.result?.reason === undefined) {
    return undefined
  }

  return {
    ...(offer.result.error === undefined ? {} : { error: offer.result.error }),
    ...(offer.result.reason === undefined
      ? {}
      : { reason: offer.result.reason }),
  }
}

type ConsoleOfferArgs = {
  integrationOfferId: Doc<"integrationOffers">["_id"]
  runId: Doc<"runs">["_id"]
  organizationId: string
}
