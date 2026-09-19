import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { hmacSha256Base64, timingSafeEqual } from "../../shared/crypto"
import { base64DecodeBytes } from "../../shared/encoding"
import { readRecord, readString } from "../../shared/input"
import { polarRequest } from "./client"
import {
  belongsToRegion,
  isPolarConfigured,
  requirePolarWebhookSecret,
} from "./config"

const toleranceSeconds = 5 * 60

/**
 * A webhook only says which order or subscription changed. What gets applied
 * is that object as Polar holds it now, so delayed, repeated, or reordered
 * deliveries cannot restore an outdated state.
 */
export async function handlePolarEvents(ctx: ActionCtx, request: Request) {
  if (!isPolarConfigured()) {
    return new Response("Billing is not available in this instance yet.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    })
  }

  const body = await request.text()

  if (!(await verifyPolarSignature(request.headers, body))) {
    return new Response("Invalid signature", { status: 400 })
  }

  const event: unknown = JSON.parse(body)
  const type = readString(event, "type") ?? ""
  const data = readRecord(readRecord(event).data)
  const id = readString(data, "id")

  if (id !== undefined && belongsToRegion(data)) {
    const path = encodeURIComponent(id)

    if (type === "order.paid") {
      await ctx.runMutation(internal.billing.polar.events.apply, {
        order: await polarRequest(`/v1/orders/${path}`),
      })
    } else if (type.startsWith("subscription.")) {
      await ctx.runMutation(internal.billing.polar.events.apply, {
        subscription: await polarRequest(`/v1/subscriptions/${path}`),
      })
    }
  }

  return new Response(null, { status: 200 })
}

/**
 * Polar follows Standard Webhooks: it signs `${id}.${timestamp}.${body}`
 * with the bytes behind the `whsec_` secret and sends `v1,<base64>` entries,
 * several while a secret is rolled.
 */
async function verifyPolarSignature(headers: Headers, body: string) {
  const id = headers.get("webhook-id")
  const timestamp = headers.get("webhook-timestamp")
  const signatures = (headers.get("webhook-signature") ?? "")
    .split(" ")
    .flatMap((entry) => (entry.startsWith("v1,") ? [entry.slice(3)] : []))
  const seconds = Number(timestamp)

  if (
    id === null ||
    timestamp === null ||
    signatures.length === 0 ||
    !Number.isFinite(seconds) ||
    Math.abs(Date.now() / 1000 - seconds) > toleranceSeconds
  ) {
    return false
  }

  const expected = await hmacSha256Base64(
    base64DecodeBytes(requirePolarWebhookSecret().replace(/^whsec_/, "")),
    `${id}.${timestamp}.${body}`
  )

  return signatures.some((signature) => timingSafeEqual(signature, expected))
}
