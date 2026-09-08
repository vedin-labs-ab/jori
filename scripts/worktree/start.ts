import { spawnSync } from "node:child_process"
import { git, requirePrimaryCheckout } from "../git.ts"
import { branchOf, readTaskName, worktreeOf } from "./paths.ts"

/**
 * Usage: pnpm task <name>
 *
 * A task branch in its own worktree, from `main` as it is on this machine,
 * with dependencies installed so the first command there is the real one.
 */
requirePrimaryCheckout("Starting a task")

const task = readTaskName(process.argv.slice(2))
const branch = branchOf(task)
const directory = worktreeOf(task)

git(["worktree", "add", "-b", branch, directory, "main"])

// The store already holds every package main needs, so an offline install
// is seconds; a package the store lacks falls through to the network.
const install = spawnSync(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["install", "--prefer-offline", "--frozen-lockfile"],
  { cwd: directory, env: { ...process.env, CI: "true" }, stdio: "inherit" }
)

if (install.status !== 0) {
  throw new Error(`Installing dependencies in ${directory} failed.`)
}

process.stdout.write(`${branch} is ready in ${directory}\n`)
