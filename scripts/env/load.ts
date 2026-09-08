import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { parseEnv } from "node:util"
import { commonDirectory } from "../git.ts"
import { environmentFile, type Target } from "./names.ts"

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
export function loadEnvironment(target: Target): LoadedEnvironment {
  const env: NodeJS.ProcessEnv = {}
  const sources: string[] = []

  for (const source of environmentSources(target)) {
    if (!existsSync(source)) {
      continue
    }

    Object.assign(env, parseEnv(readFileSync(source, "utf8")))
    sources.push(source)
  }

  Object.assign(env, process.env)

  if (isEmpty(env.CONVEX_DEPLOYMENT)) {
    throw new Error(missingMessage(target, sources))
  }

  return { env, sources }
}

function environmentSources(target: Target) {
  const fileName = environmentFile(target)
  const candidates = [
    primaryCheckoutPath(fileName),
    path.join(process.cwd(), fileName),
  ]

  return [...new Set(candidates)].filter(
    (source): source is string => source !== null
  )
}

function primaryCheckoutPath(fileName: string) {
  try {
    return path.join(path.dirname(commonDirectory()), fileName)
  } catch {
    return null
  }
}

function isEmpty(value: string | undefined) {
  return value === undefined || value.trim() === ""
}

function missingMessage(target: Target, sources: readonly string[]) {
  return [
    `Missing ${target} environment: CONVEX_DEPLOYMENT`,
    `Loaded: ${sources.length === 0 ? "no env files" : sources.join(", ")}`,
    `Add it to ${environmentFile(target)} in this checkout or the primary`,
    "checkout.",
  ].join("\n")
}
