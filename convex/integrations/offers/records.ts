import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import {
  internalMutation,
  type MutationCtx,
  mutation,
} from "../../_generated/server"
import { requireOrganizationAccess } from "../../access"
import { readUserProfile } from "../../access/users"
import { ensureCurrentPerson } from "../../persons/account"
import { createPersonActor } from "../../shared/actor"
import { integrationValidator } from "../../shared/integrations"
import {
  createSignedInstallState,
  installPathForIntegration,
} from "../connect/install"
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

export async function claimIntegrationOffer(
  ctx: MutationCtx,
  args: { offer: Doc<"integrationOffers">; returnUrl: string }
) {
  const { actor, personId } = await readClaimActor(ctx, args.offer)
  const now = Date.now()

  await requireClaimableOffer(ctx, args.offer, { now, personId })
  await upsertIntegrationOfferSourceIdentity(ctx, {
    organizationId: args.offer.organizationId,
    personId,
    source: args.offer.source,
  })

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
