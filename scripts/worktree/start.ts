import { installHooks } from "../gate/hooks.ts"
import { git, requirePrimaryCheckout } from "../git.ts"
import { installCommand, runCommand } from "../process.ts"
import { branchOf, readTaskName, worktreeOf } from "./paths.ts"

/**
 * Usage: pnpm task <name>
 *
 * A task branch in its own worktree, from `main` as it is on this machine,
 * with dependencies installed so the first command there is the real one.
 */
requirePrimaryCheckout("Starting a task")
installHooks()

const task = readTaskName(process.argv.slice(2))
const branch = branchOf(task)
const directory = worktreeOf(task)

git(["worktree", "add", "-b", branch, directory, "main"])
await runCommand(installCommand(directory))

process.stdout.write(`${branch} is ready in ${directory}\n`)
