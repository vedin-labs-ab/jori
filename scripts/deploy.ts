import { spawnSync } from "node:child_process"
import { createInterface } from "node:readline/promises"
import { type Region } from "../contracts/region.ts"
import { verifyFrontend } from "./env/frontend.ts"
import { deploymentNames, readTarget, targetRegion } from "./env/names.ts"
import { loadTarget } from "./env/target.ts"
import { isVerified } from "./gate/stamp.ts"
import { git, isClean, requirePrimaryCheckout } from "./git.ts"
import { packageCommand, runCommand, toolCommand } from "./process.ts"

/**
 * Usage: pnpm ship <dev|prod-eu|prod-us> [--yes]
 *
 * Development is a sandbox the `pnpm dev` watcher already pushes to, so it
 * gets no gate here. Production is deliberate: every guard runs before
 * anything is touched, so a dirty checkout, the wrong branch, unpushed
 * commits, a failing gate, or a half-configured deployment all stop the
 * deploy while it is still a no-op. `--yes` stands in for the typed
 * confirmation where no terminal is attached.
 */
const branch = "main"
const argv = process.argv.slice(2)
const confirmed = argv.includes("--yes")
const target = readTarget(argv.filter((argument) => argument !== "--yes"))
const region = targetRegion(target)

requirePrimaryCheckout("Shipping")

if (region === undefined) {
  await deployDevelopment()
} else {
  await deployProduction(region)
}

async function deployDevelopment() {
  const env = loadTarget(target)

  await step(env, "Deploying Convex", ["convex", "dev", "--once"])
  await syncSkills(env)
  write(`${target} is deployed.`)
}

async function deployProduction(region: Region) {
  requireCleanCheckout()
  requireBranch()
  requirePushedBranch()

  const env = loadTarget(target)

  await requireConfirmation()
  await requireGate()

  requireDeploymentVariables(env, region)
  verifyFrontend(env, region)

  // Each layer deploys before the one that calls it: the frontend is served
  // against the Convex functions, so the backend leads it, and the skills
  // sync runs on the functions it was just deployed with.
  await step(env, "Deploying Convex", ["convex", "deploy", "--yes"])
  await step(env, "Deploying frontend", ["vercel", "deploy", "--prod", "--yes"])
  await syncSkills(env)
  write(`${target} is deployed.`)
}

function requireCleanCheckout() {
  if (!isClean()) {
    throw new Error(
      "The checkout has uncommitted changes. Commit or stash them first."
    )
  }
}

function requireBranch() {
  const current = git(["rev-parse", "--abbrev-ref", "HEAD"])

  if (current !== branch) {
    throw new Error(`Production deploys run from ${branch}, not ${current}.`)
  }
}

/** Production runs code that exists on the remote, so what is live can always
 *  be recovered from origin rather than from one laptop. */
function requirePushedBranch() {
  git(["fetch", "origin", branch])

  if (git(["rev-parse", branch]) !== git(["rev-parse", `origin/${branch}`])) {
    throw new Error(
      `${branch} and origin/${branch} differ. Push ${branch} before shipping.`
    )
  }
}

async function requireConfirmation() {
  if (confirmed) {
    return
  }

  if (!process.stdin.isTTY) {
    throw new Error(`No terminal to confirm in. Pass --yes to ship ${target}.`)
  }

  const revision = git(["rev-parse", "--short", "HEAD"])
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  const answer = await readline.question(
    `Ship ${revision} to ${target}? Type "${target}" to continue: `
  )

  readline.close()

  if (answer.trim() !== target) {
    throw new Error("Deploy cancelled.")
  }
}

/** The gate runs once per tree. Landing on main records a pass, so shipping
 *  what just landed skips straight to deploying. */
async function requireGate() {
  if (isVerified()) {
    write("The gate already passed on this tree.")

    return
  }

  await runCommand(packageCommand("check"))
  await runCommand(packageCommand("test"))
}

/**
 * Every variable the deployment needs to serve a request, checked against the
 * deployment itself. Values are never read or printed: a missing name is the
 * whole answer, and the command that reports it must not leak the rest.
 */
function requireDeploymentVariables(env: NodeJS.ProcessEnv, region: Region) {
  const output = commandOutput(
    env,
    ["convex", "env", "list", "--names-only"],
    "Reading the production Convex environment failed."
  )
  const present = new Set(
    output.split("\n").map((line) => line.split("=")[0].trim())
  )
  const missing = deploymentNames.filter((name) => !present.has(name))

  if (missing.length > 0) {
    throw new Error(
      [
        `The production Convex deployment is missing: ${missing.join(", ")}`,
        "Set each one with: npx convex env set <NAME> <value>",
      ].join("\n")
    )
  }

  requireBackendIdentity(env, region)
}

function requireBackendIdentity(env: NodeJS.ProcessEnv, region: Region) {
  const actualRegion = commandOutput(
    env,
    ["convex", "env", "get", "JORI_REGION"],
    "Cannot verify backend region"
  ).trim()
  if (actualRegion !== region) {
    throw new Error("Convex region identity does not match the target")
  }
  const actualOrigin = commandOutput(
    env,
    ["convex", "env", "get", "JORI_APP_URL"],
    "Cannot verify backend origin"
  ).trim()
  if (actualOrigin !== env[`VITE_JORI_${region.toUpperCase()}_ORIGIN`]) {
    throw new Error("Backend origin does not match the regional frontend")
  }
}

function commandOutput(
  env: NodeJS.ProcessEnv,
  args: string[],
  failure: string
) {
  const command = toolCommand(args)
  const result = spawnSync(command.command, command.args, {
    encoding: "utf8",
    env,
    stdio: ["ignore", "pipe", "pipe"],
  })

  if (result.status !== 0) {
    throw new Error(`${failure}\n${result.stderr.trim()}`)
  }

  return result.stdout
}

function syncSkills(env: NodeJS.ProcessEnv) {
  return step(env, "Syncing skills", [
    "convex",
    "run",
    "skills/catalog:syncGlobalSkills",
  ])
}

async function step(
  env: NodeJS.ProcessEnv,
  label: string,
  args: string[]
): Promise<void> {
  write(`${label}...`)

  await runCommand({ ...toolCommand(args), env, label })
}

function write(message: string) {
  process.stdout.write(`${message}\n`)
}
