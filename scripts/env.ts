import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { parseEnv } from "node:util"

const convexDeploymentEnv = "CONVEX_DEPLOYMENT"

const command = process.argv.slice(2)

if (command.length === 0) {
  throw new Error("Missing command.")
}

const resolved = resolveEnv()
const missing = requiredEnvironmentVariables(command).filter((name) =>
  isEmpty(resolved.env[name])
)

if (missing.length > 0) {
  process.stderr.write(
    [
      `Missing required local environment: ${missing.join(", ")}`,
      `Loaded: ${formatSources(resolved.sources)}`,
      "Add the missing values to .env.local in this checkout or the primary checkout.",
      "",
    ].join("\n")
  )
  process.exit(1)
}

const result = spawnSync(command[0], command.slice(1), {
  env: resolved.env,
  stdio: "inherit",
})

if (result.error !== undefined) {
  throw result.error
}

process.exit(result.status ?? 1)

function resolveEnv() {
  const env = { ...process.env }
  const sources: string[] = []

  for (const source of getEnvSources()) {
    if (!existsSync(source)) {
      continue
    }

    Object.assign(env, parseEnv(readFileSync(source, "utf8")))
    sources.push(source)
  }

  Object.assign(env, process.env)

  return { env, sources }
}

function requiredEnvironmentVariables(command: readonly string[]) {
  return isConvexConfigureCommand(command) ? [] : [convexDeploymentEnv]
}

function isConvexConfigureCommand(command: readonly string[]) {
  const convexIndex = command.indexOf("convex")

  return (
    convexIndex !== -1 &&
    command[convexIndex + 1] === "dev" &&
    command.includes("--configure")
  )
}

function getEnvSources() {
  return unique([
    getPrimaryWorktreeEnvPath(),
    path.join(process.cwd(), ".env.local"),
  ]).filter((source): source is string => source !== null)
}

function getPrimaryWorktreeEnvPath() {
  const result = spawnSync("git", ["rev-parse", "--git-common-dir"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })

  if (result.status !== 0) {
    return null
  }

  return path.join(
    path.dirname(path.resolve(process.cwd(), result.stdout.trim())),
    ".env.local"
  )
}

function unique(values: Array<string | null>) {
  return [...new Set(values)]
}

function isEmpty(value: string | undefined) {
  return value === undefined || value.trim() === ""
}

function formatSources(sources: readonly string[]) {
  return sources.length === 0 ? "no env files" : sources.join(", ")
}
