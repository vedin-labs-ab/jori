import { type WaitlistField } from "@contracts/waitlist"

export type WaitlistResult =
  | { status: "joined" }
  | { status: "throttled" }
  | { status: "rejected"; field: WaitlistField; message: string }
  | { status: "failed" }

/** Marketing pages render outside the Convex React provider, so the waitlist
 *  posts to the deployment's HTTP route directly. That route is also the only
 *  surface where the caller's address is readable, which is what lets the
 *  server rate limit per caller rather than globally. */
export async function joinWaitlist(input: {
  company: string
  email: string
  size: string
  work: string
}): Promise<WaitlistResult> {
  const siteUrl = import.meta.env.VITE_CONVEX_SITE_URL

  if (!siteUrl) {
    throw new Error("Missing VITE_CONVEX_SITE_URL")
  }

  const response = await fetch(`${siteUrl}/waitlist`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  })
  const payload: unknown = await response.json().catch(() => undefined)

  return isWaitlistResult(payload) ? payload : { status: "failed" }
}

function isWaitlistResult(value: unknown): value is WaitlistResult {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const { status } = value as { status?: unknown }

  return status === "joined" || status === "throttled" || status === "rejected"
}
