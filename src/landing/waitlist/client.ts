import { type Region } from "@contracts/region"
import { type WaitlistField } from "@contracts/waitlist"
import { regionConfig } from "@/shared/region/config"

type WaitlistResult =
  | { status: "joined" }
  | { status: "throttled" }
  | { status: "rejected"; field: WaitlistField; message: string }
  | { status: "failed" }

/** Marketing pages render outside the Convex React provider, so the waitlist
 *  posts to the deployment's HTTP route directly. That route is also the only
 *  surface where the caller's address is readable, which is what lets the
 *  server rate limit per caller rather than globally. */
export async function joinWaitlist(
  input: {
    company: string
    email: string
    size: string
    work: string
  },
  region: Region
): Promise<WaitlistResult> {
  const siteUrl = waitlistSite(region)

  const response = await fetch(`${siteUrl}/waitlist`, {
    method: "POST",
    credentials: "omit",
    redirect: "error",
    referrerPolicy: "no-referrer",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  })
  const payload: unknown = await response.json().catch(() => undefined)

  return isWaitlistResult(payload) ? payload : { status: "failed" }
}

export function waitlistSite(region: Region, environment = import.meta.env) {
  if (!regionConfig.enabled.has(region)) {
    throw new Error("Region is not available.")
  }
  const name = `VITE_JORI_${region.toUpperCase()}_SITE_URL`
  const value =
    environment[name] ??
    (environment.DEV && region === regionConfig.current
      ? environment.VITE_CONVEX_SITE_URL
      : undefined)
  if (typeof value !== "string" || value === "") {
    throw new Error(`Missing ${name}`)
  }
  const url = new URL(value)
  if (
    url.origin !== value ||
    !url.hostname.endsWith(".convex.site") ||
    url.protocol !== "https:"
  ) {
    throw new Error(`${name} must be a Convex HTTPS site origin.`)
  }
  return url.origin
}

function isWaitlistResult(value: unknown): value is WaitlistResult {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const { status } = value as { status?: unknown }

  return status === "joined" || status === "throttled" || status === "rejected"
}
