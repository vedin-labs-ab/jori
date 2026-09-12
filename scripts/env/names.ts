import { isRegion, type Region } from "../../contracts/region.ts"

export const targets = ["dev", "prod-eu", "prod-us"] as const

export type Target = (typeof targets)[number]

export function isTarget(value: unknown): value is Target {
  return targets.some((target) => target === value)
}

export function readTarget(argv: readonly string[]): Target {
  const [target, ...rest] = argv

  if (!isTarget(target) || rest.length > 0) {
    throw new Error(`Choose a target: ${targets.join(", ")}.`)
  }

  return target
}

export function targetRegion(target: Target): Region | undefined {
  const region = target.split("-")[1]

  return isRegion(region) ? region : undefined
}

// Convex and Vite use .env.local for development. Production files are
// target-specific so Vite does not load them during local development.
export function environmentFile(target: Target) {
  return target === "dev" ? ".env.local" : `.env.${target}.local`
}

/** Variables the Convex deployment itself must hold before it can serve a
 *  request, verified against the deployment before every production deploy.
 *
 *  This is the set the public product needs: marketing, sign-in, the
 *  waitlist, and agent runs. Sign-in requires both social providers because
 *  `createAuth` resolves every credential on each auth request, so a missing
 *  Microsoft secret breaks Google sign-in too. Runs execute inside the
 *  deployment, so they need the model key and the Blaxel workspace, key and
 *  image to open a sandbox. Stripe is optional for deployment: its
 *  server-side edge rejects billing operations until all billing settings
 *  exist. A deploy is not approval to charge customers. */
export const deploymentNames = [
  "BETTER_AUTH_SECRET",
  "BIRD_API_KEY",
  "BIRD_WORKSPACE_ID",
  "BL_API_KEY",
  "BL_WORKSPACE",
  "DO_NOT_TRACK",
  "PARALLEL_API_KEY",
  "PARALLEL_SEARCH_BASE_URL",
  "PARALLEL_EXTRACT_BASE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "JORI_APP_URL",
  "JORI_BLAXEL_IMAGE",
  "JORI_PUBLIC_ORIGIN",
  "JORI_REGION",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "OPENROUTER_API_KEY",
] as const
