import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { hmacSha256Hex, timingSafeEqual } from "../../shared/crypto"
import { isStripeConfigured, requireStripeWebhookSecret } from "./config"
import { readCheckoutSubscription } from "./fulfillment"

const toleranceSeconds = 5 * 60

export async function handleStripeEvents(ctx: ActionCtx, request: Request) {
  if (!isStripeConfigured()) {
    return new Response("Billing is not available in this instance yet.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    })
  }

  const body = await request.text()
  const header = request.headers.get("stripe-signature")

  if (header === null || !(await verifyStripeSignature(header, body))) {
    return new Response("Invalid signature", { status: 400 })
  }

  const event: unknown = JSON.parse(body)
  const subscription = await readCheckoutSubscription(event)
  await ctx.runMutation(internal.billing.stripe.events.apply, {
    event,
    ...(subscription === undefined ? {} : { subscription }),
  })

  return new Response(null, { status: 200 })
}

/**
 * Stripe signs `${timestamp}.${body}` with the endpoint secret and sends
 * `t=...,v1=...` (possibly several v1 entries while a secret is rolled).
 */
async function verifyStripeSignature(header: string, body: string) {
  const parts = header.split(",").map((part) => part.split("="))
  const timestamp = parts.find(([key]) => key === "t")?.[1]
  const signatures = parts
    .filter(([key]) => key === "v1")
    .flatMap(([, value]) => (value === undefined ? [] : [value]))

  if (timestamp === undefined || signatures.length === 0) {
    return false
  }

  const seconds = Number(timestamp)

  if (
    !Number.isFinite(seconds) ||
    Math.abs(Date.now() / 1000 - seconds) > toleranceSeconds
  ) {
    return false
  }

  const expected = await hmacSha256Hex(
    requireStripeWebhookSecret(),
    `${timestamp}.${body}`
  )

  return signatures.some((signature) => timingSafeEqual(signature, expected))
}
