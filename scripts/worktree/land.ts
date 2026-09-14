import { existsSync } from "node:fs"
import { acquireLock } from "../gate/lock.ts"
import { isVerified } from "../gate/stamp.ts"
import { git, isClean, requirePrimaryCheckout } from "../git.ts"
import { installCommand, packageCommand, runCommand } from "../process.ts"
import { branchOf, readTaskName, worktreeOf } from "./paths.ts"

/**
 * Usage: pnpm land <name> [--no-verify]
 *
 * Rebases the task on `main`, runs the gate in the task's worktree, and
 * fast-forwards `main` from here, in that order and only in that order. The
 * merge runs from the primary checkout because a merge run inside the
 * worktree merges the branch into itself and reports success. The gate lock
 * is held from rebase through the dev server refresh: one landing at a
 * time, each gating the tree it lands, and never two refreshes racing for
 * the port. `--no-verify` skips the gate without recording a verification
 * pass.
 */
requirePrimaryCheckout("Landing")

if (git(["branch", "--show-current"]) !== "main") {
  throw new Error(
    "Landing requires main to be checked out in the primary checkout."
  )
}

const args = process.argv.slice(2)
const skipGate = args.at(-1) === "--no-verify"
const task = readTaskName(skipGate ? args.slice(0, -1) : args)
const branch = branchOf(task)
const directory = worktreeOf(task)

if (!existsSync(directory)) {
  throw new Error(`No worktree at ${directory}. Start one with pnpm task.`)
}

if (!isClean(directory)) {
  throw new Error(`${directory} has uncommitted changes. Commit them first.`)
}

const release = await acquireLock()

try {
  if (rebase()) {
    await runCommand(installCommand(directory))
  }
  await gate()
  fastForward()
  await runCommand(packageCommand("dev:up"))
} finally {
  release()
}

process.stdout.write(
  `${branch} landed on main at ${git(["rev-parse", "--short", "main"])}.\n`
)

/** Rebases when main moved; tells whether that brought a lockfile change,
 *  which the worktree has to install before it is gated. */
function rebase() {
  // Preserve merged branches when the task already includes main.
  if (git(["merge-base", "main", branch]) === git(["rev-parse", "main"])) {
    return false
  }

  const lockfile = git(["rev-parse", "HEAD:pnpm-lock.yaml"], directory)

  try {
    git(["rebase", "main"], directory)
  } catch (error) {
    git(["rebase", "--abort"], directory)

    throw new Error(
      `${branch} does not rebase cleanly on main. Rebase it in ${directory}, resolve the conflicts, and land again.`,
      { cause: error }
    )
  }

  return git(["rev-parse", "HEAD:pnpm-lock.yaml"], directory) !== lockfile
}

/** The gate runs in the worktree, on the rebased tree, and records its pass
 *  under the shared git directory, where the deploy that follows reads it. */
async function gate() {
  if (skipGate) {
    process.stdout.write("Gate skipped; no verification recorded.\n")

    return
  }

  if (isVerified(directory)) {
    process.stdout.write("Gate already passed on this tree.\n")

    return
  }

  await runCommand({ ...packageCommand("check"), cwd: directory })
  await runCommand({ ...packageCommand("test"), cwd: directory })
}

function fastForward() {
  if (git(["merge-base", "main", branch]) !== git(["rev-parse", "main"])) {
    throw new Error("main moved while the gate ran. Run pnpm land again.")
  }

  git(["merge", "--ff-only", branch])
  git(["worktree", "remove", directory])
  // `-d` refuses a branch whose upstream lacks the merge main just took.
  git(["branch", "-D", branch])
}
