import { type Region } from "../../contracts/region.ts"
import { loadEnvironment } from "./load.ts"
import { type Target, targetRegion } from "./names.ts"

/** A target's environment, checked for the crossed wires a production
 *  target can have: a frontend pointed at one region's backend, or a deploy
 *  key for another. Development has one deployment and nothing to cross. */
export function loadTarget(target: Target) {
  const { env } = loadEnvironment(target)
  const region = targetRegion(target)

  if (region !== undefined) {
    validateTarget(env, region)
  }

  return env
}

export function validateTarget(env: NodeJS.ProcessEnv, region: Region) {
  for (const name of [
    "CONVEX_DEPLOYMENT",
    "VERCEL_PROJECT_ID",
    "VERCEL_ORG_ID",
    "VITE_CONVEX_URL",
    "VITE_CONVEX_SITE_URL",
  ]) {
    if (!env[name]?.trim()) {
      throw new Error(`Missing regional target setting: ${name}`)
    }
  }
  if (env.VITE_JORI_REGION !== region) {
    throw new Error("Frontend region does not match the deployment target")
  }
  const deployment = env.CONVEX_DEPLOYMENT?.replace(/^(dev|prod|preview):/, "")
  const suffix = region === "eu" ? ".eu-west-1" : ""
  if (
    env.VITE_CONVEX_URL !== `https://${deployment}${suffix}.convex.cloud` ||
    env.VITE_CONVEX_SITE_URL !== `https://${deployment}${suffix}.convex.site`
  ) {
    throw new Error(
      "Frontend and backend must target the same Convex deployment"
    )
  }
  if (!env.CONVEX_DEPLOY_KEY?.startsWith(`prod:${deployment}|`)) {
    throw new Error(
      "The deploy key must belong to this exact production deployment"
    )
  }
  if (
    env[`VITE_JORI_${region.toUpperCase()}_SITE_URL`] !==
    env.VITE_CONVEX_SITE_URL
  ) {
    throw new Error("Waitlist must target the same regional Convex deployment")
  }
}
