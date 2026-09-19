import { internal } from "../../../_generated/api"
import { type Doc } from "../../../_generated/dataModel"
import { type ActionCtx } from "../../../_generated/server"
import { readRecord } from "../../../shared/input"
import { polarList, polarRequest, requireString } from "../client"
import { belongsToRegion } from "../config"
import { type CheckoutArgs } from "./index"

type Reservation = NonNullable<
  NonNullable<Doc<"accounts">["checkouts"]>["plan"]
>
const pending =
  "A checkout is already being prepared or its payment is pending. Please try again shortly. If this continues, contact support before purchasing again."
const terminal = new Set(["canceled", "unpaid", "incomplete_expired"])

export async function recurringCheckout(
  ctx: ActionCtx,
  args: CheckoutArgs,
  create: (attempt: string) => Promise<Record<string, unknown>>
): Promise<{ url: string }> {
  if (args.kind === "top-up") {
    throw new Error("Top-ups do not reserve recurring checkout.")
  }
  const kind = args.kind
  const reserve = async (replaces?: string): Promise<Reservation> =>
    await ctx.runMutation(internal.billing.polar.session.reservation.reserve, {
      organizationId: args.organizationId,
      kind,
      productId: args.productId,
      attempt: crypto.randomUUID(),
      ...(replaces === undefined ? {} : { replaces }),
    })
  let reservation = await reserve()
  // One rotation permits expired/completed recovery without unbounded retries.
  for (let round = 0; round < 2; round++) {
    const identity = {
      organizationId: args.organizationId,
      kind,
      attempt: reservation.attempt,
    }
    const checkout = await resolveCheckout(
      ctx,
      args,
      reservation,
      identity,
      create
    )
    verifyCheckout(checkout, args, reservation)
    const checkoutId = requireString(checkout, "id")
    await ctx.runMutation(internal.billing.polar.session.reservation.attach, {
      ...identity,
      checkoutId,
    })
    if (checkout.status === "open") {
      return await openCheckout(checkout, args, reservation)
    }
    const completed =
      checkout.status === "succeeded" &&
      (await subscriptionEnded(checkoutId, args, reservation))
    if (
      checkout.status !== "expired" &&
      checkout.status !== "failed" &&
      !completed
    ) {
      throw new Error(pending)
    }
    if (round === 1) {
      throw new Error(pending)
    }
    reservation = await reserve(reservation.attempt)
  }
  throw new Error(pending)
}

async function resolveCheckout(
  ctx: ActionCtx,
  args: CheckoutArgs,
  reservation: Reservation,
  identity: {
    organizationId: string
    kind: "plan" | "storage"
    attempt: string
  },
  create: (attempt: string) => Promise<Record<string, unknown>>
): Promise<Record<string, unknown>> {
  if (reservation.checkoutId !== undefined) {
    return await polarRequest(
      `/v1/checkouts/${encodeURIComponent(reservation.checkoutId)}`
    )
  }
  if (reservation.started) {
    // Never retry a POST whose response was lost; recover its durable metadata.
    const candidates = await polarList("/v1/checkouts/", {
      customer_id: args.customerId,
      product_id: reservation.productId,
    })
    const matches = candidates.filter(
      (item) =>
        readRecord(item.metadata).checkoutAttempt === reservation.attempt
    )
    if (matches.length !== 1 || matches[0] === undefined) {
      throw new Error(pending)
    }
    return matches[0]
  }
  const existing = await preflight(args, reservation)
  if (existing !== undefined) {
    return existing
  }
  if (reservation.productId !== args.productId) {
    throw new Error(
      "The reserved checkout product changed. Contact support before purchasing again."
    )
  }
  const started = await ctx.runMutation(
    internal.billing.polar.session.reservation.start,
    identity
  )
  if (!started) {
    throw new Error(pending)
  }
  return await create(reservation.attempt)
}

async function preflight(args: CheckoutArgs, reservation: Reservation) {
  // Adopt legacy sessions; reject subscriptions whose fulfillment has not arrived.
  const subscriptions = await polarList("/v1/subscriptions/", {
    customer_id: args.customerId,
    product_id: reservation.productId,
  })
  if (subscriptions.some((item) => !terminal.has(String(item.status)))) {
    throw new Error(
      "This subscription already exists or is pending. Use Manage billing."
    )
  }
  const candidates = await polarList("/v1/checkouts/", {
    customer_id: args.customerId,
    product_id: reservation.productId,
    status: ["open", "confirmed", "succeeded"],
  })
  const unresolved = candidates.filter(
    (checkout) =>
      checkout.status !== "succeeded" ||
      !hasEndedSubscription(
        requireString(checkout, "id"),
        args,
        reservation,
        subscriptions
      )
  )
  if (unresolved.length > 1) {
    throw new Error(
      "Multiple checkouts are pending. Contact support before purchasing again."
    )
  }
  return unresolved[0]
}

async function openCheckout(
  checkout: Record<string, unknown>,
  args: CheckoutArgs,
  reservation: Reservation
) {
  const checkoutId = requireString(checkout, "id")
  if (reservation.productId !== args.productId) {
    throw new Error(
      "An earlier checkout is still open. Contact support before purchasing again."
    )
  }
  if (args.units !== undefined && checkout.units !== args.units) {
    checkout = await polarRequest(
      `/v1/checkouts/${encodeURIComponent(checkoutId)}`,
      { method: "PATCH", body: { units: args.units } }
    )
    verifyCheckout(checkout, args, reservation)
    if (checkout.status !== "open" || checkout.units !== args.units) {
      throw new Error(pending)
    }
  }
  return { url: requireString(checkout, "url") }
}

function verifyCheckout(
  checkout: Record<string, unknown>,
  args: CheckoutArgs,
  reservation: Reservation
) {
  const metadata = readRecord(checkout.metadata)
  if (
    checkout.customer_id !== args.customerId ||
    checkout.product_id !== reservation.productId ||
    metadata.organizationId !== args.organizationId ||
    metadata.kind !== args.kind ||
    !belongsToRegion(checkout)
  ) {
    throw new Error(
      "Could not verify the existing checkout. Contact support before purchasing again."
    )
  }
}

async function subscriptionEnded(
  checkoutId: string,
  args: CheckoutArgs,
  reservation: Reservation
) {
  const subscriptions = await polarList("/v1/subscriptions/", {
    customer_id: args.customerId,
    product_id: reservation.productId,
  })
  return hasEndedSubscription(checkoutId, args, reservation, subscriptions)
}

function hasEndedSubscription(
  checkoutId: string,
  args: CheckoutArgs,
  reservation: Reservation,
  subscriptions: Record<string, unknown>[]
) {
  const matches = subscriptions.filter(
    (item) =>
      item.checkout_id === checkoutId &&
      item.customer_id === args.customerId &&
      item.product_id === reservation.productId &&
      readRecord(item.metadata).organizationId === args.organizationId &&
      belongsToRegion(item)
  )
  return (
    matches.length === 1 &&
    terminal.has(String(matches[0]?.status)) &&
    subscriptions.every((item) => terminal.has(String(item.status)))
  )
}
