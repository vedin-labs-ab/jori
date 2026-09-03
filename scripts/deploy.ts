import { spawnSync } from "node:child_process"
import { createInterface } from "node:readline/promises"
import { loadEnvironment } from "./env/load.ts"
import { deploymentNames } from "./env/names.ts"
import { packageCommand, runCommand, toolCommand } from "./process.ts"

const environment = "prod"
const branch = "main"

await deployProduction()

/**
 * Production is deliberate, so every guard runs before anything is touched:
 * a dirty checkout, the wrong branch, unpushed commits, a failing check, or a
 * half-configured deployment all stop the deploy while it is still a no-op.
 */
async function deployProduction() {
  requireCleanCheckout()
  requireBranch()
  requirePushedBranch()

  const { env } = loadEnvironment(environment)

  await requireConfirmation()
  await runCommand(packageCommand("check"))
  await runCommand(packageCommand("test"))

  requireDeploymentVariables(env)

  // Each layer deploys before the one that calls it: the frontend is served
  // against the Convex functions, so the backend leads it, and the skills
  // sync runs on the functions it was just deployed with.
  await step(env, "Deploying Convex", ["convex", "deploy", "--yes"])
  await step(env, "Deploying frontend", ["vercel", "deploy", "--prod", "--yes"])
  await step(env, "Syncing skills", [
    "convex",
    "run",
    "skills/catalog:syncGlobalSkills",
  ])

  write("Production deploy complete.")
}

function requireCleanCheckout() {
  if (git(["status", "--porcelain"]) !== "") {
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
      `${branch} and origin/${branch} differ. Push ${branch} before deploying.`
    )
  }
}

async function requireConfirmation() {
  const revision = git(["rev-parse", "--short", "HEAD"])
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  const answer = await readline.question(
    `Deploy ${revision} to production? Type "${environment}" to continue: `
  )

  readline.close()

  if (answer.trim() !== environment) {
    throw new Error("Deploy cancelled.")
  }
}

/**
 * Every variable the deployment needs to serve a request, checked against the
 * deployment itself. Values are never read or printed: a missing name is the
 * whole answer, and the command that reports it must not leak the rest.
 */
function requireDeploymentVariables(env: NodeJS.ProcessEnv) {
  const output = commandOutput(
    env,
    ["convex", "env", "list"],
    "Reading the production Convex environment failed."
  )
  const present = new Set(
    output.split("\n").map((line) => line.split("=")[0].trim())
  )

  reportMissing(
    deploymentNames.filter((name) => !present.has(name)),
    "The production Convex deployment",
    "Set each one with: npx convex env set <NAME> <value>"
  )
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

function reportMissing(
  missing: readonly string[],
  where: string,
  remedy: string
) {
  if (missing.length > 0) {
    throw new Error(
      [`${where} is missing: ${missing.join(", ")}`, remedy].join("\n")
    )
  }
}

async function step(
  env: NodeJS.ProcessEnv,
  label: string,
  args: string[]
): Promise<void> {
  write(`${label}...`)

  await runCommand({ ...toolCommand(args), env, label })
}

function git(args: string[]) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })

  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed.\n${result.stderr.trim()}`)
  }

  return result.stdout.trim()
}

function write(message: string) {
  process.stdout.write(`${message}\n`)
}
