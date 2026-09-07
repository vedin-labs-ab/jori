import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { parseEnv } from "node:util"
import { type Region } from "../../contracts/region.ts"
import { type Environment, environmentFile, localNames } from "./names.ts"

type LoadedEnvironment = {
  env: NodeJS.ProcessEnv
  sources: string[]
}

/**
 * The environment for one target, read from its env file.
 *
 * A task worktree has no env file of its own, so the primary checkout's file
 * is read first and a local file may override it. Real process environment
 * always wins, which is what lets a one-off command point somewhere else
 * without editing a file.
 */
export function loadEnvironment(
  environment: Environment,
  region?: Region
): LoadedEnvironment {
  const env: NodeJS.ProcessEnv = {}
  const sources: string[] = []

  for (const source of environmentSources(environment, region)) {
    if (!existsSync(source)) {
      continue
    }

    Object.assign(env, parseEnv(readFileSync(source, "utf8")))
    sources.push(source)
  }

  Object.assign(env, process.env)

  const required =
    region === undefined ? localNames[environment] : ["CONVEX_DEPLOYMENT"]
  const missing = required.filter((name) => isEmpty(env[name]))

  if (missing.length > 0) {
    throw new Error(missingMessage(environment, missing, sources, region))
  }

  return { env, sources }
}

function environmentSources(environment: Environment, region?: Region) {
  const fileName = environmentFile(environment, region)
  const candidates = [
    primaryCheckoutPath(fileName),
    path.join(process.cwd(), fileName),
  ]

  return [...new Set(candidates)].filter(
    (source): source is string => source !== null
  )
}

function primaryCheckoutPath(fileName: string) {
  const result = spawnSync("git", ["rev-parse", "--git-common-dir"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })

  if (result.status !== 0) {
    return null
  }

  return path.join(
    path.dirname(path.resolve(process.cwd(), result.stdout.trim())),
    fileName
  )
}

function isEmpty(value: string | undefined) {
  return value === undefined || value.trim() === ""
}

function missingMessage(
  environment: Environment,
  missing: readonly string[],
  sources: readonly string[],
  region?: Region
) {
  return [
    `Missing ${environment} environment: ${missing.join(", ")}`,
    `Loaded: ${sources.length === 0 ? "no env files" : sources.join(", ")}`,
    `Add the missing values to ${environmentFile(environment, region)} in this`,
    "checkout or the primary checkout.",
  ].join("\n")
}
