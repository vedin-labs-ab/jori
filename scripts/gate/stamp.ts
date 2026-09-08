import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { commonDirectory, isClean, treeHash } from "../git.ts"

/**
 * Which gates a tree has passed, so a deploy never reruns what landing
 * already ran on the same code.
 *
 * The record lives under the git directory every worktree shares, keyed by
 * tree hash rather than commit: a fast-forward keeps the tree, so a branch
 * gated in its worktree is still verified once it is `main`. Only a clean
 * tree is recorded, because a dirty one has no hash that describes it.
 */
const gates = ["check", "test"] as const

export type Gate = (typeof gates)[number]

export function recordGate(gate: Gate, cwd = process.cwd()) {
  if (!isClean(cwd)) {
    return false
  }

  const directory = gateDirectory(cwd)

  mkdirSync(directory, { recursive: true })
  writeFileSync(path.join(directory, gate), treeHash(cwd))

  return true
}

export function isVerified(cwd = process.cwd()) {
  if (!isClean(cwd)) {
    return false
  }

  const tree = treeHash(cwd)
  const directory = gateDirectory(cwd)

  return gates.every((gate) => readGate(path.join(directory, gate)) === tree)
}

function gateDirectory(cwd: string) {
  return path.join(commonDirectory(cwd), "gate")
}

function readGate(file: string) {
  try {
    return readFileSync(file, "utf8").trim()
  } catch {
    return undefined
  }
}
