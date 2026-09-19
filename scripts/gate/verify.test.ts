import { randomBytes } from "node:crypto"
import { rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { expect, test } from "vitest"
import { createRepository } from "../fixtures"
import { treeHash } from "../git"
import { isVerified, recordGate } from "./stamp"
import { verifyGate } from "./verify"

test.each([false, true])(
  "rejects a removed historical secret with cached checks (skipChecks=%s)",
  async (skipChecks) => {
    const { directory, git } = createRepository()
    const originalTree = treeHash(directory)
    recordGate("check", originalTree, directory)
    recordGate("test", originalTree, directory)

    writeFileSync(path.join(directory, "credential.txt"), testCredential())
    git(["add", "."])
    git(["commit", "-m", "Add synthetic test credential"])
    rmSync(path.join(directory, "credential.txt"))
    git(["add", "."])
    git(["commit", "-m", "Remove synthetic test credential"])

    expect(treeHash(directory)).toBe(originalTree)
    expect(isVerified(directory)).toBe(true)
    await expect(verifyGate(directory, skipChecks)).rejects.toThrow(
      "Git history secret scan failed with exit code 1"
    )
  }
)

test("a newly added ref is scanned even when the checked-out commit is verified", async () => {
  const { directory, git } = createRepository()
  const originalTree = treeHash(directory)
  recordGate("check", originalTree, directory)
  recordGate("test", originalTree, directory)
  await expect(verifyGate(directory)).resolves.toBeUndefined()

  git(["checkout", "-b", "other"])
  writeFileSync(path.join(directory, "credential.txt"), testCredential())
  git(["add", "."])
  git(["commit", "-m", "Add synthetic test credential"])
  git(["checkout", "main"])

  expect(isVerified(directory)).toBe(true)
  await expect(verifyGate(directory)).rejects.toThrow(
    "Git history secret scan failed with exit code 1"
  )
})

/** Construct a disposable token shape at runtime, never a checked-in value. */
function testCredential() {
  return `${["gh", "p"].join("")}_${randomBytes(20).toString("hex")}\n`
}
