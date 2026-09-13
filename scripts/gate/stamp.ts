import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"
import { commonDirectory, isClean, treeHash } from "../git.ts"

/**
 * Which gates a tree has passed, so a deploy never reruns what landing
 * already ran on the same code.
 *
 * Records live under the git directory every worktree shares, one folder
 * per tree hash rather than commit: a fast-forward keeps the tree, so a
 * branch gated in its worktree is still verified once it is `main`, and a
 * gate passing in one worktree never overwrites another's. Only a clean
 * tree is recorded, because a dirty one has no hash that describes it.
 */
const gates = ["check", "test"] as const
const keepMs = 7 * 24 * 60 * 60 * 1000

export type Gate = (typeof gates)[number]

/** Records a pass for `tree`, the hash read before the gate ran, so a
 *  commit or rebase during the run credits nothing. */
export function recordGate(gate: Gate, tree: string, cwd = process.cwd()) {
  if (!isClean(cwd) || treeHash(cwd) !== tree) {
    return false
  }

  const root = gateDirectory(cwd)
  const directory = path.join(root, tree)

  mkdirSync(directory, { recursive: true })
  writeFileSync(path.join(directory, gate), "")
  prune(root)

  return true
}

export function isVerified(cwd = process.cwd()) {
  if (!isClean(cwd)) {
    return false
  }

  const directory = path.join(gateDirectory(cwd), treeHash(cwd))

  return gates.every((gate) => existsSync(path.join(directory, gate)))
}

function gateDirectory(cwd: string) {
  return path.join(commonDirectory(cwd), "gate")
}

/** Trees older than a week have long since landed or been abandoned. */
function prune(root: string) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const directory = path.join(root, entry.name)

    if (
      entry.isDirectory() &&
      Date.now() - statSync(directory).mtimeMs > keepMs
    ) {
      rmSync(directory, { force: true, recursive: true })
    }
  }
}
