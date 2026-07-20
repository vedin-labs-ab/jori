import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

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

    Object.assign(env, readEnvFile(source))
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

function readEnvFile(filePath: string) {
  const env: Record<string, string> = {}

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()

    if (trimmed === "" || trimmed.startsWith("#")) {
      continue
    }

    const withoutExport = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length).trim()
      : trimmed
    const separator = withoutExport.indexOf("=")

    if (separator === -1) {
      continue
    }

    const name = withoutExport.slice(0, separator).trim()
    const rawValue = stripInlineComment(
      withoutExport.slice(separator + 1)
    ).trim()

    if (/^[A-Z_][A-Z0-9_]*$/.test(name)) {
      env[name] = parseEnvValue(rawValue)
    }
  }

  return env
}

function stripInlineComment(value: string) {
  let quote: string | null = null

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]

    if ((char === '"' || char === "'") && value[index - 1] !== "\\") {
      quote = quote === char ? null : char
      continue
    }

    if (
      char === "#" &&
      quote === null &&
      (index === 0 || /\s/.test(value[index - 1]))
    ) {
      return value.slice(0, index)
    }
  }

  return value
}

function parseEnvValue(value: string) {
  if (value.length < 2) {
    return value
  }

  const quote = value[0]
  const last = value[value.length - 1]

  if ((quote === '"' || quote === "'") && last === quote) {
    return value.slice(1, -1)
  }

  return value
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
