import { isRegion, type Region } from "../../contracts/region.ts"
import { loadEnvironment } from "./load.ts"
import { type Environment } from "./names.ts"

export function readTargetArguments(args: string[]): Region {
  if (args.length !== 2 || args[0] !== "--region" || !isRegion(args[1])) {
    throw new Error("Choose an explicit target: --region eu or --region us")
  }
  return args[1]
}

export function loadTarget(environment: Environment, region: Region) {
  const { env } = loadEnvironment(environment, region)
  validateTarget(env, region)
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
