import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { requirePrimaryCheckout } from "../git.ts"
import { packageCommand, runCommand } from "../process.ts"
import { readTaskName, worktreeOf } from "./paths.ts"
import { previewEnvFile, previewSettings, previewSources } from "./preview.ts"

/**
 * Usage: pnpm backend <name>
 *
 * Gives a task's worktree its own Convex backend: a preview deployment with
 * dev's settings, the worktree's `.env.local` pointed at it, and the
 * worktree's code pushed. Run it again to refresh the settings and push.
 *
 * Settings move from dev to the preview one at a time through this process
 * and are never printed or written to disk. Only their names are listed.
 */
requirePrimaryCheckout("Creating a task backend")

const task = readTaskName(process.argv.slice(2))
const directory = worktreeOf(task)
const envFile = path.join(directory, ".env.local")

if (!existsSync(directory)) {
  throw new Error(`No worktree at ${directory}. Start one with pnpm task.`)
}

const url = existsSync(envFile) ? readUrl() : create()
const names = convex(["env", "list", "--names-only"]).split("\n")
const settings = previewSettings(url)

for (const [name, source] of previewSources(names.filter(Boolean))) {
  if (!(name in settings)) {
    set(name, convex(["env", "get", source]))
  }
}

for (const [name, value] of Object.entries(settings)) {
  set(name, value)
}

await runCommand({
  ...packageCommand("exec", "convex", "dev", "--once"),
  cwd: directory,
})
process.stdout.write(`${task} has its own backend at ${url}\n`)

function create() {
  // Convex reports the new deployment on stderr.
  const output = convex(
    [
      "deployment",
      "create",
      task,
      "--type",
      "preview",
      "--expiration",
      "in 5 days",
    ],
    { report: true }
  )
  const created = /https:\/\/([a-z0-9-]+)[.a-z0-9-]*\.convex\.cloud/.exec(
    output
  )

  if (created === null) {
    throw new Error("Convex did not report the new deployment's URL.")
  }

  writeFileSync(envFile, previewEnvFile(created[1], created[0]))

  return created[0]
}

function readUrl() {
  const url = /^VITE_CONVEX_URL=(.+)$/m.exec(readFileSync(envFile, "utf8"))

  if (url === null) {
    throw new Error(`${envFile} names no Convex deployment.`)
  }

  return url[1]
}

/** Values pass through stdin, so they reach neither argv nor the terminal. */
function set(name: string, value: string) {
  convex(["env", "set", name], { cwd: directory, input: value })
}

function convex(
  args: string[],
  options: { cwd?: string; input?: string; report?: boolean } = {}
) {
  const result = spawnSync("pnpm", ["exec", "convex", ...args], {
    cwd: options.cwd,
    encoding: "utf8",
    input: options.input,
    stdio: ["pipe", "pipe", "pipe"],
  })

  if (result.status !== 0) {
    throw new Error(`convex ${args.slice(0, 2).join(" ")} failed.`)
  }

  return (options.report ? result.stderr : result.stdout).trim()
}
