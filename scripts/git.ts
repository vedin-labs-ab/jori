import { spawnSync } from "node:child_process"
import path from "node:path"

export function git(args: readonly string[], cwd = process.cwd()) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })

  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed.\n${result.stderr.trim()}`)
  }

  return result.stdout.trim()
}

/** Nothing modified, staged, or untracked. Ignored files do not count, so
 *  env files never make a checkout dirty. */
export function isClean(cwd = process.cwd()) {
  return git(["status", "--porcelain"], cwd) === ""
}

/** The `.git` directory every worktree of the repository shares. */
export function commonDirectory(cwd = process.cwd()) {
  return path.resolve(cwd, git(["rev-parse", "--git-common-dir"], cwd))
}

/** The primary checkout owns `main` and the env files; a task worktree's
 *  own git directory is a pointer into the primary's. */
export function isPrimaryCheckout(cwd = process.cwd()) {
  return (
    path.resolve(cwd, git(["rev-parse", "--git-dir"], cwd)) ===
    commonDirectory(cwd)
  )
}

export function requirePrimaryCheckout(action: string) {
  if (!isPrimaryCheckout()) {
    throw new Error(`${action} runs from the primary checkout, not a worktree.`)
  }
}

/** The content of the committed tree, independent of which commit holds it. */
export function treeHash(cwd = process.cwd()) {
  return git(["rev-parse", "HEAD^{tree}"], cwd)
}
