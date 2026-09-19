import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { isWorkspaceDeleting } from "../../retention/access"
import { readNumber, readRecord, readString } from "../../shared/input"
import { queueCancellation } from "../polar/cancellation"
import { belongsToRegion } from "../polar/config"
import { sellsStorage, validExtraGb } from "./config"

export function matchesStorageSubscription(
  account: Doc<"accounts">,
  subscription: Record<string, unknown>
) {
  return (
    belongsToRegion(subscription) &&
    sellsStorage(subscription.product_id) &&
    subscription.customer_id === account.polar?.customerId &&
    readRecord(subscription.metadata).organizationId ===
      account.organizationId &&
    subscription.currency === "usd" &&
    subscription.recurring_interval === "month" &&
    subscription.recurring_interval_count === 1
  )
}

/** Initial paid orders attach the subscription; all later changes follow its
 * current provider state. No storage purchase credits or debits the wallet. */
export async function applyStorageOrder(
  ctx: MutationCtx,
  account: Doc<"accounts">,
  order: Record<string, unknown>
) {
  const subscription = readRecord(order.subscription)
  const subscriptionId = readString(subscription, "id")
  const orderId = readString(order, "id")
  if (
    orderId === undefined ||
    subscriptionId === undefined ||
    subscriptionId !== order.subscription_id ||
    !matchesStorageSubscription(account, subscription) ||
    !validExtraGb(subscription.units) ||
    subscription.status !== "active" ||
    order.currency !== "usd"
  ) {
    return
  }
  if (
    (await blocked(ctx, account)) ||
    (account.storage !== undefined &&
      account.storage.subscriptionId !== subscriptionId)
  ) {
    await queueCancellation(ctx, {
      organizationId: account.organizationId,
      customerId: String(subscription.customer_id),
      subscriptionId,
      orderId,
    })
    return
  }
  if (
    account.storage === undefined &&
    order.billing_reason !== "subscription_create"
  ) {
    return
  }
  await writeStorage(
    ctx,
    account,
    subscription,
    account.storage?.purchaseOrderId ?? orderId
  )
}

export async function applyStorageSubscription(
  ctx: MutationCtx,
  account: Doc<"accounts">,
  subscription: Record<string, unknown>
) {
  const stored = account.storage
  if (
    stored === undefined ||
    stored.subscriptionId !== subscription.id ||
    !matchesStorageSubscription(account, subscription)
  ) {
    return
  }
  const modifiedAt = timestamp(subscription)
  if (
    modifiedAt === undefined ||
    modifiedAt < (account.storageUpdatedAt ?? 0)
  ) {
    return
  }
  if (
    ["canceled", "unpaid", "incomplete_expired"].includes(
      String(subscription.status)
    )
  ) {
    await ctx.db.patch(account._id, {
      storage: undefined,
      storageUpdatedAt: modifiedAt,
      updatedAt: Date.now(),
    })
    return
  }
  if (await blocked(ctx, account)) {
    await cancelStorage(ctx, account)
    return
  }
  if (subscription.status === "paused") {
    await ctx.db.patch(account._id, {
      storage: {
        ...stored,
        extraGb: 0,
        renewsAt: undefined,
        pendingGb: undefined,
      },
      storageUpdatedAt: modifiedAt,
      updatedAt: Date.now(),
    })
    return
  }
  if (subscription.status === "active" || subscription.status === "past_due") {
    await writeStorage(ctx, account, subscription, stored.purchaseOrderId)
  }
}

/** Reuse the persisted, verified cancellation path when the base plan ends. */
export async function cancelStorage(
  ctx: MutationCtx,
  account: Doc<"accounts">
) {
  if (account.storage === undefined || account.polar === undefined) {
    return
  }
  await queueCancellation(ctx, {
    organizationId: account.organizationId,
    customerId: account.polar.customerId,
    subscriptionId: account.storage.subscriptionId,
    orderId: account.storage.purchaseOrderId,
  })
  await ctx.db.patch(account._id, {
    storage: { ...account.storage, extraGb: 0, pendingGb: 0 },
    updatedAt: Date.now(),
  })
}

async function blocked(ctx: MutationCtx, account: Doc<"accounts">) {
  return (
    account.state.kind !== "active" ||
    account.refundHold !== undefined ||
    (await isWorkspaceDeleting(ctx, account.organizationId))
  )
}

function timestamp(subscription: Record<string, unknown>) {
  const value = Date.parse(
    readString(subscription, "modified_at") ??
      readString(subscription, "created_at") ??
      ""
  )
  return Number.isFinite(value) ? value : undefined
}

async function writeStorage(
  ctx: MutationCtx,
  account: Doc<"accounts">,
  subscription: Record<string, unknown>,
  purchaseOrderId: string
) {
  const modifiedAt = timestamp(subscription)
  const units = subscription.units
  if (
    modifiedAt === undefined ||
    !validExtraGb(units) ||
    modifiedAt < (account.storageUpdatedAt ?? 0) ||
    (account.storage === undefined &&
      modifiedAt <= (account.storageUpdatedAt ?? 0))
  ) {
    return
  }
  const periodEnd = Date.parse(
    readString(subscription, "current_period_end") ?? ""
  )
  const pending = readNumber(subscription.pending_update, "units")
  const extraGb =
    subscription.status === "past_due"
      ? Math.min(account.storage?.extraGb ?? 0, units)
      : units
  await ctx.db.patch(account._id, {
    storageUpdatedAt: modifiedAt,
    storage: {
      subscriptionId: String(subscription.id),
      purchaseOrderId,
      extraGb,
      renewsAt: Number.isFinite(periodEnd) ? periodEnd : undefined,
      pendingGb:
        subscription.cancel_at_period_end === true
          ? 0
          : validExtraGb(pending)
            ? pending
            : undefined,
    },
    updatedAt: Date.now(),
  })
}
