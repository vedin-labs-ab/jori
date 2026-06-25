import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { wakeRun } from "../../runtime/waiters/data"
import { type Actor } from "../../shared/actor"
import { recordTransition } from "../../transitions"

type IntegrationOfferPatch = Partial<
  Omit<Doc<"integrationOffers">, "_creationTime" | "_id">
>
type IntegrationOfferDelivery = NonNullable<
  Doc<"integrationOffers">["delivery"]
>

export async function recordIntegrationOfferCreated(
  ctx: MutationCtx,
  offer: Doc<"integrationOffers">
) {
  await recordTransition(ctx, {
    tenantId: offer.tenantId,
    subject: { kind: "integrationOffer", id: offer._id },
    type: "created",
  })
}

export async function markIntegrationOfferConnected(
  ctx: MutationCtx,
  offer: Doc<"integrationOffers">,
  args: {
    integrationId: Doc<"integrations">["_id"]
    now: number
  }
) {
  if (isSettled(offer)) {
    return
  }

  await cancelExpiration(ctx, offer)
  const result = {
    ...(offer.claim?.actor === undefined ? {} : { actor: offer.claim.actor }),
    integrationId: args.integrationId,
  }
  const updated = await patchAndRead(ctx, offer._id, {
    functionId: undefined,
    status: "connected",
    result,
    updatedAt: args.now,
  })

  if (updated !== null) {
    await recordTransition(ctx, {
      tenantId: updated.tenantId,
      subject: { kind: "integrationOffer", id: updated._id },
      syncSurface: true,
      type: "connected",
    })
    await wakeOfferRun(ctx, updated)
  }
}

export async function markIntegrationOfferCancelled(
  ctx: MutationCtx,
  offer: Doc<"integrationOffers">,
  args: {
    actor: Actor | undefined
    reason?: string
    now: number
  }
) {
  if (isSettled(offer)) {
    return
  }

  await cancelExpiration(ctx, offer)
  const result = cancelledResult(args)
  const updated = await patchAndRead(ctx, offer._id, {
    functionId: undefined,
    result,
    status: "cancelled",
    updatedAt: args.now,
  })

  if (updated !== null) {
    await recordTransition(ctx, {
      tenantId: updated.tenantId,
      subject: { kind: "integrationOffer", id: updated._id },
      syncSurface: true,
      type: "cancelled",
    })
    await wakeOfferRun(ctx, updated)
  }
}

function cancelledResult(args: { actor: Actor | undefined; reason?: string }) {
  if (args.actor === undefined && args.reason === undefined) {
    return undefined
  }

  return {
    ...(args.actor === undefined ? {} : { actor: args.actor }),
    ...(args.reason === undefined ? {} : { reason: args.reason }),
  }
}

export async function markIntegrationOfferFailed(
  ctx: MutationCtx,
  offer: Doc<"integrationOffers">,
  args: {
    error: string
    now: number
  }
) {
  if (isSettled(offer)) {
    return
  }

  await cancelExpiration(ctx, offer)
  const updated = await patchAndRead(ctx, offer._id, {
    functionId: undefined,
    status: "failed",
    result: { error: args.error },
    updatedAt: args.now,
  })

  if (updated !== null) {
    await recordTransition(ctx, {
      tenantId: updated.tenantId,
      subject: { kind: "integrationOffer", id: updated._id },
      syncSurface: true,
      type: "failed",
    })
    await wakeOfferRun(ctx, updated)
  }
}

export async function markIntegrationOfferExpired(
  ctx: MutationCtx,
  offer: Doc<"integrationOffers">,
  now: number
) {
  if (isSettled(offer)) {
    return
  }

  const updated = await patchAndRead(ctx, offer._id, {
    functionId: undefined,
    status: "expired",
    updatedAt: now,
  })

  if (updated !== null) {
    await recordTransition(ctx, {
      tenantId: updated.tenantId,
      subject: { kind: "integrationOffer", id: updated._id },
      syncSurface: true,
      type: "expired",
    })
    await wakeOfferRun(ctx, updated)
  }
}

export async function recordIntegrationOfferDelivery(
  ctx: MutationCtx,
  offer: Doc<"integrationOffers">,
  delivery: IntegrationOfferDelivery
) {
  const updated = await patchAndRead(ctx, offer._id, {
    delivery,
    updatedAt: Date.now(),
  })

  if (updated !== null) {
    await recordTransition(ctx, {
      tenantId: updated.tenantId,
      subject: { kind: "integrationOffer", id: updated._id },
      syncSurface: isSettled(updated),
      type: "delivered",
    })
  }
}

export async function patchAndRead(
  ctx: MutationCtx,
  integrationOfferId: Doc<"integrationOffers">["_id"],
  patch: IntegrationOfferPatch
) {
  await ctx.db.patch(integrationOfferId, patch)

  return await ctx.db.get(integrationOfferId)
}

async function cancelExpiration(
  ctx: MutationCtx,
  offer: Doc<"integrationOffers">
) {
  if (offer.functionId === undefined) {
    return
  }

  await ctx.scheduler.cancel(offer.functionId)
}

function isSettled(offer: Doc<"integrationOffers">) {
  return (
    offer.status === "cancelled" ||
    offer.status === "connected" ||
    offer.status === "expired" ||
    offer.status === "failed"
  )
}

async function wakeOfferRun(ctx: MutationCtx, offer: Doc<"integrationOffers">) {
  if (offer.runId === undefined || offer.awaited !== true) {
    return
  }

  await wakeRun(ctx, {
    runId: offer.runId,
    reason: "resolved",
    subject: { kind: "offer", id: offer._id },
  })
}
