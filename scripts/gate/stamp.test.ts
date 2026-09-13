import { writeFileSync } from "node:fs"
import path from "node:path"
import { expect, test } from "vitest"
import { createRepository } from "../fixtures"
import { treeHash } from "../git"
import { isVerified, recordGate } from "./stamp"

test("a pass recorded for one tree survives a pass recorded for another", () => {
  const { directory, git } = createRepository()
  const first = treeHash(directory)

  expect(recordGate("check", first, directory)).toBe(true)
  expect(recordGate("test", first, directory)).toBe(true)
  expect(isVerified(directory)).toBe(true)

  writeFileSync(path.join(directory, "file.txt"), "changed\n")
  git(["add", "."])
  git(["commit", "-m", "Second"])
  expect(isVerified(directory)).toBe(false)
  expect(recordGate("check", treeHash(directory), directory)).toBe(true)

  git(["checkout", "--detach", "HEAD~1"])
  expect(isVerified(directory)).toBe(true)
})

test("a tree that changed or is dirty while the gate ran records nothing", () => {
  const { directory, git } = createRepository()
  const before = treeHash(directory)

  writeFileSync(path.join(directory, "file.txt"), "changed\n")
  expect(recordGate("check", before, directory)).toBe(false)

  git(["add", "."])
  git(["commit", "-m", "Second"])
  expect(recordGate("check", before, directory)).toBe(false)
  expect(isVerified(directory)).toBe(false)
})
