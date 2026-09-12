import { requireStripeSecretKey } from "./config"

const baseUrl = "https://api.stripe.com"

type StripeParams = {
  [key: string]: string | number | boolean | StripeParams | undefined
}

/**
 * The whole Stripe surface Jori uses is a handful of REST calls, so the edge
 * is a plain fetch client with Stripe's form encoding rather than an SDK.
 * Responses come back as loosely typed objects; call sites read the few
 * fields they need with the readers below.
 */
export async function stripeRequest(
  path: string,
  args?: {
    method?: "GET" | "POST" | "DELETE"
    params?: StripeParams
    idempotencyKey?: string
  }
): Promise<Record<string, unknown>> {
  const method = args?.method ?? "POST"
  const form = encodeForm(args?.params ?? {})
  const query = method === "GET" && form.size > 0 ? `?${form}` : ""
  const response = await fetch(`${baseUrl}${path}${query}`, {
    method,
    headers: {
      authorization: `Bearer ${requireStripeSecretKey()}`,
      ...(method !== "GET"
        ? { "content-type": "application/x-www-form-urlencoded" }
        : {}),
      ...(args?.idempotencyKey === undefined
        ? {}
        : { "idempotency-key": args.idempotencyKey }),
    },
    ...(method !== "GET" ? { body: form.toString() } : {}),
  })
  const payload = (await response.json()) as Record<string, unknown>

  if (!response.ok) {
    throw new Error(`Stripe request failed: ${readStripeError(payload)}`)
  }

  return payload
}

function readStripeError(payload: Record<string, unknown>) {
  const error = payload.error

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message

    if (typeof message === "string") {
      return message
    }
  }

  return "Unknown error"
}

/** Stripe's bracket form encoding: nested objects become `parent[child]`. */
function encodeForm(
  params: StripeParams,
  prefix = "",
  form = new URLSearchParams()
) {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue
    }

    const name = prefix === "" ? key : `${prefix}[${key}]`

    if (typeof value === "object") {
      encodeForm(value, name, form)
    } else {
      form.append(name, String(value))
    }
  }

  return form
}

/** For fields a successful Stripe response must carry, like session URLs. */
export function requireString(payload: Record<string, unknown>, key: string) {
  const value = payload[key]

  if (typeof value !== "string") {
    throw new Error(`Stripe response is missing "${key}".`)
  }

  return value
}
