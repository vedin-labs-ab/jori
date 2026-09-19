import { spawnSync } from "node:child_process"

async function main() {
  const options = parseArguments(process.argv.slice(2))

  if (options.help) {
    printUsage()
    return
  }

  requireDevelopmentDeployment()
  writeStdout("Seeding the development deployment.")

  const scope =
    options.organizationId === undefined
      ? {}
      : { organizationId: options.organizationId }

  report("Foundation", runStage("seed:foundation", scope))
  report(
    "Library",
    runStage("seed:library", {
      ...scope,
      uploads: runStage("seed:uploads", scope),
    })
  )
  report("Work", runStage("seed:work", scope))
  report("History", runStage("seed:history", scope))

  writeStdout("Seeding finished.")
}

/** Seeding writes fixtures over whatever is there, so the target is never an
 *  argument: it is whichever deployment the development environment names,
 *  and anything else stops the command. */
function requireDevelopmentDeployment() {
  const deployment = process.env.CONVEX_DEPLOYMENT?.trim() ?? ""

  if (!deployment.startsWith("dev:")) {
    throw new Error(
      `Seeding only runs against a development deployment, not ${deployment === "" ? "an unset CONVEX_DEPLOYMENT" : deployment}.`
    )
  }
}

function parseArguments(arguments_: readonly string[]) {
  let help = false
  let organizationId: string | undefined

  for (const [index, argument] of arguments_.entries()) {
    if (argument === "--") {
      continue
    }

    if (argument === "--help" || argument === "-h") {
      help = true
      continue
    }

    if (argument === "--organization") {
      organizationId = arguments_[index + 1]
      if (!organizationId?.trim() || organizationId.startsWith("-")) {
        throw new Error("--organization requires an organization ID.")
      }
      continue
    }

    if (arguments_[index - 1] !== "--organization") {
      throw new Error(`Unknown argument: ${argument}`)
    }
  }

  return { help, organizationId }
}

function runStage(reference: string, args: Record<string, unknown>): unknown {
  const command = process.platform === "win32" ? "npx.cmd" : "npx"
  const result = spawnSync(
    command,
    [
      "convex",
      "run",
      "--typecheck=disable",
      "--codegen=disable",
      reference,
      JSON.stringify(args),
    ],
    { cwd: process.cwd(), encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] }
  )

  if (result.status !== 0) {
    const details = [result.stderr.trim(), result.stdout.trim()]
      .filter((value) => value.length > 0)
      .join("\n")

    throw new Error(details.length > 0 ? details : `${reference} failed.`)
  }

  return JSON.parse(result.stdout.trim())
}

function report(stage: string, result: unknown) {
  const counts = Object.entries(result as Record<string, unknown>)
    .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
    .join(", ")

  writeStdout(`${stage}: ${counts}`)
}

function printUsage() {
  writeStdout("Usage: pnpm db:seed dev [--organization <id>]")
  writeStdout("")
  writeStdout(
    "Fills the development Convex deployment with a worked-in workspace:"
  )
  writeStdout(
    "people, Slack places and traffic, folders, tables, stores, files,"
  )
  writeStdout("skills, jobs, sixty days of runs, and usage.")
  writeStdout("")
  writeStdout(
    "The organization defaults to the only one the deployment holds a profile for."
  )
  writeStdout(
    "Places, traffic, jobs, and events hang off a connected Slack integration and are left out without one."
  )
}

function writeStdout(message: string) {
  process.stdout.write(`${message}\n`)
}

function writeStderr(message: string) {
  process.stderr.write(`${message}\n`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Seeding failed."

  writeStderr(message)
  process.exitCode = 1
})
