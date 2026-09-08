import { existsSync } from "node:fs"
import { isVerified } from "../gate/stamp.ts"
import { git, isClean, requirePrimaryCheckout } from "../git.ts"
import { packageCommand, runCommand } from "../process.ts"
import { branchOf, readTaskName, worktreeOf } from "./paths.ts"

/**
 * Usage: pnpm land <name>
 *
 * Rebases the task on `main`, runs the gate in the task's worktree, and
 * fast-forwards `main` from here, in that order and only in that order. The
 * merge runs from the primary checkout because a merge run inside the
 * worktree merges the branch into itself and reports success. If `main`
 * moved while the gate ran, nothing lands and the command says to run it
 * again, which repeats the rebase on the new `main`.
 */
requirePrimaryCheckout("Landing")

const task = readTaskName(process.argv.slice(2))
const branch = branchOf(task)
const directory = worktreeOf(task)

if (!existsSync(directory)) {
  throw new Error(`No worktree at ${directory}. Start one with pnpm task.`)
}

if (!isClean(directory)) {
  throw new Error(`${directory} has uncommitted changes. Commit them first.`)
}

rebase()
await gate()
fastForward()

process.stdout.write(
  `${branch} landed on main at ${git(["rev-parse", "--short", "main"])}.\n`
)

function rebase() {
  try {
    git(["rebase", "main"], directory)
  } catch (error) {
    git(["rebase", "--abort"], directory)

    throw new Error(
      `${branch} does not rebase cleanly on main. Rebase it in ${directory}, resolve the conflicts, and land again.`,
      { cause: error }
    )
  }
}

/** The gate runs in the worktree, on the rebased tree, and records its pass
 *  under the shared git directory, where the deploy that follows reads it. */
async function gate() {
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
  git(["branch", "-d", branch])
}
