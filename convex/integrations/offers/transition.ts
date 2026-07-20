import { compactRecord } from "../../../contracts/json"
import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { wakeRun } from "../../runs/execution/waiters/data"
import { type Actor } from "../../shared/actor"
import {
  type IntegrationOfferTransitionType,
  recordTransition,
} from "../../transitions"
import { scheduleTransitionSurfaceSync } from "../surface"

type IntegrationOfferPatch = Partial<
  Omit<Doc<"integrationOffers">, "_creationTime" | "_id">
>
type IntegrationOfferDelivery = NonNullable<
  Doc<"integrationOffers">["delivery"]
>
export type TerminalIntegrationOfferStatus =
  | "cancelled"
  | "connected"
  | "expired"
  | "failed"

export async function recordIntegrationOfferCreated(
  ctx: MutationCtx,
  offer: Doc<"integrationOffers">
) {
  await recordIntegrationOfferTransition(ctx, offer, "created")
}

export async function markIntegrationOfferConnected(
  ctx: MutationCtx,
  offer: Doc<"integrationOffers">,
  args: {
    integrationId: Doc<"integrations">["_id"]
    now: number
  }
) {
  const result = compactRecord({
    actor: offer.claim?.actor,
    integrationId: args.integrationId,
  })

  await settleIntegrationOffer(ctx, offer, {
    cancelExpiration: true,
    patch: { result, updatedAt: args.now },
    status: "connected",
  })
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
  const result = cancelledResult(args)

  await settleIntegrationOffer(ctx, offer, {
    cancelExpiration: true,
    patch: { result, updatedAt: args.now },
    status: "cancelled",
  })
}

function cancelledResult(args: { actor: Actor | undefined; reason?: string }) {
  if (args.actor === undefined && args.reason === undefined) {
    return undefined
  }

  return compactRecord({
    actor: args.actor,
    reason: args.reason,
  })
}

export async function markIntegrationOfferFailed(
  ctx: MutationCtx,
  offer: Doc<"integrationOffers">,
  args: {
    error: string
    now: number
  }
) {
  await settleIntegrationOffer(ctx, offer, {
    cancelExpiration: true,
    patch: { result: { error: args.error }, updatedAt: args.now },
    status: "failed",
  })
}

export async function markIntegrationOfferExpired(
  ctx: MutationCtx,
  offer: Doc<"integrationOffers">,
  now: number
) {
  await settleIntegrationOffer(ctx, offer, {
    cancelExpiration: false,
    patch: { updatedAt: now },
    status: "expired",
  })
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
    await recordIntegrationOfferTransition(
      ctx,
      updated,
      "delivered",
      terminalIntegrationOfferStatus(updated.status) !== null
    )
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

async function settleIntegrationOffer(
  ctx: MutationCtx,
  offer: Doc<"integrationOffers">,
  args: {
    cancelExpiration: boolean
    patch: IntegrationOfferPatch
    status: TerminalIntegrationOfferStatus
  }
) {
  if (terminalIntegrationOfferStatus(offer.status) !== null) {
    return
  }

  if (args.cancelExpiration) {
    await cancelExpiration(ctx, offer)
  }

  const updated = await patchAndRead(ctx, offer._id, {
    ...args.patch,
    functionId: undefined,
    status: args.status,
  })

  if (updated !== null) {
    await recordIntegrationOfferTransition(ctx, updated, args.status, true)
    await wakeOfferRun(ctx, updated)
  }
}

async function recordIntegrationOfferTransition(
  ctx: MutationCtx,
  offer: Doc<"integrationOffers">,
  type: IntegrationOfferTransitionType,
  syncSurface = false
) {
  const subject = {
    kind: "integrationOffer" as const,
    id: offer._id,
  }

  await recordTransition(ctx, {
    organizationId: offer.organizationId,
    subject,
    type,
  })

  if (syncSurface) {
    await scheduleTransitionSurfaceSync(ctx, subject)
  }
}

export function terminalIntegrationOfferStatus(
  status: Doc<"integrationOffers">["status"]
): TerminalIntegrationOfferStatus | null {
  return status === "cancelled" ||
    status === "connected" ||
    status === "expired" ||
    status === "failed"
    ? status
    : null
}

async function wakeOfferRun(ctx: MutationCtx, offer: Doc<"integrationOffers">) {
  if (offer.runId === undefined) {
    return
  }

  await wakeRun(ctx, {
    runId: offer.runId,
    reason: "resolved",
    subject: { kind: "offer", id: offer._id },
  })
}
