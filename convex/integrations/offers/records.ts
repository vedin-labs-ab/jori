import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import {
  internalMutation,
  type MutationCtx,
  mutation,
} from "../../_generated/server"
import { requireExecutingRun } from "../../runs/execution/guard"
import { integrationValidator } from "../../shared/integrations"
import { claimIntegrationOffer } from "./claims"
import {
  findIntegrationOfferByToken,
  integrationOfferLocation,
  normalizeIntegrationOfferReturnUrl,
} from "./helpers"
import { integrationOfferSource } from "./schema"
import {
  createIntegrationOfferToken,
  hashIntegrationOfferToken,
} from "./tokens"
import {
  markIntegrationOfferCancelled,
  patchAndRead,
  recordIntegrationOfferCreated,
} from "./transition"

export { claimIntegrationOffer } from "./claims"

const integrationOfferTtlMs = 30 * 60 * 1000
export const integrationOfferClaimResult = v.union(
  v.object({
    status: v.literal("ready"),
    integration: integrationValidator,
    installPath: v.string(),
    state: v.string(),
    expiresAt: v.number(),
  }),
  v.object({
    status: v.literal("connected"),
    integration: integrationValidator,
    integrationId: v.optional(v.id("integrations")),
  })
)

export const create = internalMutation({
  args: {
    organizationId: v.string(),
    integration: integrationValidator,
    summary: v.string(),
    source: integrationOfferSource,
  },
  returns: v.object({
    integrationOfferId: v.id("integrationOffers"),
    integration: integrationValidator,
    url: v.string(),
    urlPath: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    if (args.source.runId !== undefined) {
      await requireExecutingRun(ctx, {
        organizationId: args.organizationId,
        runId: args.source.runId,
      })
    }
    const token = createIntegrationOfferToken()
    const location = integrationOfferLocation(token)
    const now = Date.now()
    const expiresAt = now + integrationOfferTtlMs
    const integrationOfferId = await ctx.db.insert("integrationOffers", {
      organizationId: args.organizationId,
      integration: args.integration,
      tokenHash: await hashIntegrationOfferToken(token),
      status: "pending",
      summary: args.summary,
      source: args.source,
      runId: args.source.runId,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    const functionId = await ctx.scheduler.runAt(
      expiresAt,
      internal.integrations.offers.lifecycle.expire,
      { integrationOfferId }
    )
    const offer = await patchAndRead(ctx, integrationOfferId, { functionId })

    if (offer !== null) {
      await recordIntegrationOfferCreated(ctx, offer)
      await supersedePriorOffers(ctx, { offer, now })
    }

    return {
      integrationOfferId,
      integration: args.integration,
      url: location.url,
      urlPath: location.urlPath,
      expiresAt,
    }
  },
})

async function supersedePriorOffers(
  ctx: MutationCtx,
  args: { offer: Doc<"integrationOffers">; now: number }
) {
  if (args.offer.runId === undefined) {
    return
  }

  const offers = ctx.db
    .query("integrationOffers")
    .withIndex("by_run_and_status", (query) =>
      query.eq("runId", args.offer.runId)
    )

  for await (const offer of offers) {
    if (canSupersede(offer, args.offer)) {
      await markIntegrationOfferCancelled(ctx, offer, {
        actor: undefined,
        reason: "Replaced by a newer integration offer.",
        now: args.now,
      })
    }
  }
}

function canSupersede(
  offer: Doc<"integrationOffers">,
  replacement: Doc<"integrationOffers">
) {
  return (
    offer._id !== replacement._id &&
    offer.integration === replacement.integration &&
    (offer.status === "pending" || offer.status === "claimed")
  )
}

export const claim = mutation({
  args: {
    token: v.string(),
    returnUrl: v.string(),
  },
  returns: integrationOfferClaimResult,
  handler: async (ctx, args) => {
    const offer = await findIntegrationOfferByToken(ctx, args.token)

    if (offer === null) {
      throw new Error("Integration offer not found.")
    }

    return await claimIntegrationOffer(ctx, {
      offer,
      returnUrl: normalizeIntegrationOfferReturnUrl(args.returnUrl),
    })
  },
})
