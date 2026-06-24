import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { type Actor } from "../../shared/actor"
import { recordSetupLinkEvent } from "./events"

type SetupLinkPatch = Partial<Omit<Doc<"setupLinks">, "_creationTime" | "_id">>
type SetupLinkDelivery = NonNullable<Doc<"setupLinks">["delivery"]>

export async function markSetupLinkConnected(
  ctx: MutationCtx,
  link: Doc<"setupLinks">,
  args: {
    integrationId: Doc<"integrations">["_id"]
    now: number
  }
) {
  if (
    link.status === "cancelled" ||
    link.status === "connected" ||
    link.status === "expired" ||
    link.status === "failed"
  ) {
    return
  }

  await cancelSetupFunction(ctx, link)
  const result = {
    ...(link.claim?.actor === undefined ? {} : { actor: link.claim.actor }),
    integrationId: args.integrationId,
  }
  const updated = await patchAndRead(ctx, link._id, {
    functionId: undefined,
    status: "connected",
    result,
    updatedAt: args.now,
  })

  if (updated !== null) {
    await recordSetupLinkEvent(ctx, {
      data: result,
      link: updated,
      syncSurface: true,
      type: "offer.connected",
    })
  }
}

export async function markSetupLinkCancelled(
  ctx: MutationCtx,
  link: Doc<"setupLinks">,
  args: {
    actor: Actor | undefined
    now: number
  }
) {
  if (
    link.status === "cancelled" ||
    link.status === "connected" ||
    link.status === "expired" ||
    link.status === "failed"
  ) {
    return
  }

  await cancelSetupFunction(ctx, link)
  const updated = await patchAndRead(ctx, link._id, {
    functionId: undefined,
    result: args.actor === undefined ? undefined : { actor: args.actor },
    status: "cancelled",
    updatedAt: args.now,
  })

  if (updated !== null) {
    await recordSetupLinkEvent(ctx, {
      data: args.actor === undefined ? undefined : { actor: args.actor },
      link: updated,
      syncSurface: true,
      type: "offer.cancelled",
    })
  }
}

export async function markSetupLinkFailed(
  ctx: MutationCtx,
  link: Doc<"setupLinks">,
  args: {
    error: string
    now: number
  }
) {
  if (
    link.status === "cancelled" ||
    link.status === "connected" ||
    link.status === "expired" ||
    link.status === "failed"
  ) {
    return
  }

  await cancelSetupFunction(ctx, link)
  const updated = await patchAndRead(ctx, link._id, {
    functionId: undefined,
    status: "failed",
    result: { error: args.error },
    updatedAt: args.now,
  })

  if (updated !== null) {
    await recordSetupLinkEvent(ctx, {
      data: { error: args.error },
      link: updated,
      syncSurface: true,
      type: "offer.failed",
    })
  }
}

export async function markSetupLinkExpired(
  ctx: MutationCtx,
  link: Doc<"setupLinks">,
  now: number
) {
  if (
    link.status === "cancelled" ||
    link.status === "connected" ||
    link.status === "expired" ||
    link.status === "failed"
  ) {
    return
  }

  const updated = await patchAndRead(ctx, link._id, {
    functionId: undefined,
    status: "expired",
    updatedAt: now,
  })

  if (updated !== null) {
    await recordSetupLinkEvent(ctx, {
      link: updated,
      syncSurface: true,
      type: "offer.expired",
    })
  }
}

export async function recordSetupLinkDelivery(
  ctx: MutationCtx,
  link: Doc<"setupLinks">,
  delivery: SetupLinkDelivery
) {
  const updated = await patchAndRead(ctx, link._id, {
    delivery,
    updatedAt: Date.now(),
  })

  if (updated !== null) {
    await recordSetupLinkEvent(ctx, {
      data: { delivery },
      link: updated,
      type: "offer.delivered",
    })
  }
}

export async function patchAndRead(
  ctx: MutationCtx,
  setupLinkId: Doc<"setupLinks">["_id"],
  patch: SetupLinkPatch
) {
  await ctx.db.patch(setupLinkId, patch)

  return await ctx.db.get(setupLinkId)
}

async function cancelSetupFunction(ctx: MutationCtx, link: Doc<"setupLinks">) {
  if (link.functionId === undefined) {
    return
  }

  await ctx.scheduler.cancel(link.functionId)
}
