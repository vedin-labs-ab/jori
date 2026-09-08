import { homedir } from "node:os"
import path from "node:path"

/** A task is one word or a few, joined by hyphens: it names the branch, the
 *  worktree, and nothing else. */
const taskPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function readTaskName(argv: readonly string[]) {
  const [name, ...rest] = argv

  if (name === undefined || !taskPattern.test(name) || rest.length > 0) {
    throw new Error("Name the task in lowercase words joined by hyphens.")
  }

  return name
}

export function branchOf(task: string) {
  return `task/${task}`
}

/** Worktrees live beside the repository, never inside it, under the
 *  repository's own name so several checkouts can share the machine. */
export function worktreeOf(task: string, checkout = process.cwd()) {
  return path.join(homedir(), ".worktrees", path.basename(checkout), task)
}
