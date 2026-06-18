import { spawnSync } from "node:child_process"

type TruncateBatchResult = {
  deletedCount: number
  deletedByTable: Array<{
    table: string
    count: number
  }>
  hasMore: boolean
}

const batchLimit = 256

async function main() {
  const options = parseArguments(process.argv.slice(2))

  if (options.help) {
    printUsage()
    return
  }

  writeStdout("Starting Convex table truncation.")

  let batchNumber = 0
  let totalDeleted = 0

  while (true) {
    batchNumber += 1

    const result = runTruncateBatch({
      deployment: options.deployment,
      limit: batchLimit,
    })

    if (result.deletedCount === 0 && result.hasMore) {
      throw new Error(
        "Truncation stalled without deleting documents. Aborting to avoid an infinite loop."
      )
    }

    totalDeleted += result.deletedCount
    printBatchResult(batchNumber, result)

    if (!result.hasMore) {
      break
    }
  }

  writeStdout(`Finished truncation. Deleted ${totalDeleted} documents.`)
}

function parseArguments(arguments_: string[]) {
  let deployment: string | null = null
  let help = false

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]
    const value = arguments_[index + 1]

    if (argument === "--") {
      continue
    }

    if (argument === "--deployment") {
      deployment = requireValue(argument, value)
      index += 1
      continue
    }

    if (argument === "--help" || argument === "-h") {
      help = true
      continue
    }

    throw new Error(`Unknown argument: ${argument}`)
  }

  return {
    deployment,
    help,
  }
}

function runTruncateBatch(args: { deployment: string | null; limit: number }) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx"
  const deploymentArgs =
    args.deployment === null ? [] : ["--deployment", args.deployment]
  const result = spawnSync(
    command,
    [
      "convex",
      "run",
      "--typecheck=disable",
      "--codegen=disable",
      ...deploymentArgs,
      "maintenance:databaseBatch",
      JSON.stringify({ limit: args.limit }),
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["inherit", "pipe", "pipe"],
    }
  )

  if (result.status !== 0) {
    const stderr = result.stderr.trim()
    const stdout = result.stdout.trim()
    const details = [stderr, stdout]
      .filter((value) => value.length > 0)
      .join("\n")

    throw new Error(
      details.length > 0 ? details : "Convex truncation command failed."
    )
  }

  return parseBatchResult(result.stdout)
}

function parseBatchResult(output: string): TruncateBatchResult {
  const normalized = output.trim()

  if (normalized.length === 0) {
    throw new Error("Convex truncation command returned no output.")
  }

  return JSON.parse(normalized) as TruncateBatchResult
}

function requireValue(flag: string, value: string | undefined) {
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`)
  }

  return value
}

function printBatchResult(batchNumber: number, result: TruncateBatchResult) {
  if (result.deletedCount === 0) {
    writeStdout(`Batch ${batchNumber}: nothing to delete.`)
    return
  }

  const summary = result.deletedByTable
    .map(({ table, count }) => `${table}=${count}`)
    .join(", ")

  writeStdout(
    `Batch ${batchNumber}: deleted ${result.deletedCount} documents (${summary}).`
  )
}

function printUsage() {
  writeStdout("Usage: pnpm convex:truncate [-- --deployment <name>]")
  writeStdout("")
  writeStdout(
    "Truncates all application tables from the current Convex deployment."
  )
}

function writeStdout(message: string) {
  process.stdout.write(`${message}\n`)
}

function writeStderr(message: string) {
  process.stderr.write(`${message}\n`)
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Convex truncation failed."

  writeStderr(message)
  process.exitCode = 1
})
