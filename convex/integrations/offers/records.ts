import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import {
  internalMutation,
  type MutationCtx,
  mutation,
} from "../../_generated/server"
import { requireTenantAccess } from "../../identity/access"
import { readClerkUserEmail, readClerkUserName } from "../../identity/users"
import { ensureCurrentPerson } from "../../persons/clerk"
import {
  createSignedInstallState,
  installPathForIntegration,
} from "../../providers/install"
import { createPersonActor } from "../../shared/actor"
import { integrationValidator } from "../../shared/integrations"
import {
  findIntegrationOfferByToken,
  integrationOfferLocation,
  normalizeIntegrationOfferReturnUrl,
  upsertIntegrationOfferSourceIdentity,
} from "./helpers"
import { integrationOfferSource } from "./schema"
import {
  createIntegrationOfferToken,
  hashIntegrationOfferToken,
} from "./tokens"
import {
  markIntegrationOfferCancelled,
  markIntegrationOfferExpired,
  patchAndRead,
  recordIntegrationOfferCreated,
} from "./transition"

const integrationOfferTtlMs = 30 * 60 * 1000

export const create = internalMutation({
  args: {
    tenantId: v.string(),
    integration: integrationValidator,
    summary: v.string(),
    source: integrationOfferSource,
    awaited: v.optional(v.boolean()),
  },
  returns: v.object({
    integrationOfferId: v.id("integrationOffers"),
    integration: integrationValidator,
    url: v.string(),
    urlPath: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const token = createIntegrationOfferToken()
    const location = integrationOfferLocation(token)
    const now = Date.now()
    const expiresAt = now + integrationOfferTtlMs
    const integrationOfferId = await ctx.db.insert("integrationOffers", {
      tenantId: args.tenantId,
      integration: args.integration,
      tokenHash: await hashIntegrationOfferToken(token),
      status: "pending",
      summary: args.summary,
      source: args.source,
      runId: args.source.runId,
      awaited: args.awaited,
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
  if (args.offer.awaited !== true || args.offer.runId === undefined) {
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
    offer.awaited === true &&
    offer.integration === replacement.integration &&
    (offer.status === "pending" || offer.status === "claimed")
  )
}

export const claim = mutation({
  args: {
    token: v.string(),
    returnUrl: v.string(),
  },
  returns: v.union(
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
  ),
  handler: async (ctx, args) => {
    const offer = await findIntegrationOfferByToken(ctx, args.token)

    if (offer === null) {
      throw new Error("Integration offer not found.")
    }

    const identity = await requireTenantAccess(ctx, offer.tenantId)
    const personId = await ensureCurrentPerson(ctx, offer.tenantId)
    const actor = createPersonActor(personId, {
      email: readClerkUserEmail(identity),
      name: readClerkUserName(identity),
    })
    const now = Date.now()

    if (offer.status === "cancelled") {
      throw new Error("This integration offer was cancelled.")
    }

    if (offer.expiresAt <= now && offer.status !== "connected") {
      await markIntegrationOfferExpired(ctx, offer, now)
      throw new Error("This integration offer has expired.")
    }

    if (offer.claim !== undefined && offer.claim.personId !== personId) {
      throw new Error(
        "This integration offer was already claimed by another person."
      )
    }

    await upsertIntegrationOfferSourceIdentity(ctx, {
      tenantId: offer.tenantId,
      personId,
      source: offer.source,
    })

    if (offer.status === "connected") {
      return {
        status: "connected" as const,
        integration: offer.integration,
        ...(offer.result?.integrationId === undefined
          ? {}
          : { integrationId: offer.result.integrationId }),
      }
    }

    await ctx.db.patch(offer._id, {
      status: "claimed",
      claim:
        offer.claim === undefined
          ? { personId, actor, at: now }
          : { ...offer.claim, actor: offer.claim.actor ?? actor },
      result: undefined,
      updatedAt: now,
    })

    const returnUrl = normalizeIntegrationOfferReturnUrl(args.returnUrl)
    const state = await createSignedInstallState(ctx, offer.integration, {
      tenantId: offer.tenantId,
      returnUrl,
      integrationOfferId: offer._id,
    })

    return {
      status: "ready" as const,
      integration: offer.integration,
      installPath: installPathForIntegration(offer.integration),
      state,
      expiresAt: offer.expiresAt,
    }
  },
})
