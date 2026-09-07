import { spawnSync } from "node:child_process"
import { type Region } from "../../contracts/region.ts"
import { toolCommand } from "../process.ts"

type Project = {
  id: string
  name: string
  resourceConfig?: {
    functionDefaultRegions?: string[]
    functionZeroConfigFailover?: boolean
  }
  env?: { key: string; value?: string; target?: string[] }[]
}

export const frontendNames = [
  "VITE_CONVEX_URL",
  "VITE_CONVEX_SITE_URL",
  "VITE_JORI_REGION",
  "VITE_JORI_ENABLED_REGIONS",
  "VITE_JORI_PUBLIC_ORIGIN",
  "VITE_JORI_EU_ORIGIN",
  "VITE_JORI_US_ORIGIN",
  "VITE_JORI_EU_SITE_URL",
  "VITE_JORI_US_SITE_URL",
  "VITE_POSTHOG_ENABLED",
  "VITE_POSTHOG_HOST",
  "VITE_POSTHOG_KEY",
] as const

/** Remote builds read Vercel's environment, not the local deploy process. */
export function verifyFrontend(env: NodeJS.ProcessEnv, region: Region) {
  const endpoint = `/v9/projects/${env.VERCEL_PROJECT_ID}?teamId=${env.VERCEL_ORG_ID}`
  const command = toolCommand(["vercel", "api", endpoint])
  const result = spawnSync(command.command, command.args, {
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  if (result.status !== 0) {
    throw new Error("Unable to verify the Vercel production configuration")
  }
  validateFrontend(JSON.parse(result.stdout) as Project, env, region)
}

export function validateFrontend(
  project: Project,
  env: NodeJS.ProcessEnv,
  region: Region
) {
  if (
    project.id !== env.VERCEL_PROJECT_ID ||
    project.name !== `jori-production-${region}`
  ) {
    throw new Error("Vercel project does not match the regional target")
  }
  const config = project.resourceConfig
  const expectedRegion = region === "eu" ? "dub1" : "iad1"
  if (
    config?.functionDefaultRegions?.join(",") !== expectedRegion ||
    config.functionZeroConfigFailover !== false
  ) {
    throw new Error("Vercel must use one regional origin without failover")
  }
  const remote = new Map(
    project.env
      ?.filter((variable) => variable.target?.includes("production"))
      .map((variable) => [variable.key, variable.value])
  )
  for (const name of frontendNames) {
    if (!env[name] || remote.get(name) !== env[name]) {
      throw new Error(`Vercel production configuration differs: ${name}`)
    }
  }
}
