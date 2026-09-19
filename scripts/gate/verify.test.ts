import { randomBytes } from "node:crypto"
import { rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { afterEach, expect, test, vi } from "vitest"
import { createRepository } from "../fixtures"
import { treeHash } from "../git"
import * as processTools from "../process"
import { isVerified, recordGate } from "./stamp"
import { verifyGate } from "./verify"

afterEach(() => vi.restoreAllMocks())

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
  writeFileSync(
    path.join(directory, "package.json"),
    JSON.stringify({ private: true })
  )
  writeFileSync(
    path.join(directory, "pnpm-lock.yaml"),
    "lockfileVersion: '9.0'\nimporters:\n  .: {}\n"
  )
  git(["add", "."])
  git(["commit", "-m", "Empty dependency graph"])
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

test("new dependency advisories block an unchanged verified tree", async () => {
  const { directory } = createRepository()
  recordGate("check", treeHash(directory), directory)
  recordGate("test", treeHash(directory), directory)
  const runCommand = processTools.runCommand
  let advisoryPublished = false
  let audits = 0
  vi.spyOn(processTools, "runCommand").mockImplementation(async (command) => {
    if (command.args[0] !== "audit") {
      return runCommand(command)
    }

    audits += 1
    if (advisoryPublished) {
      throw new Error("Dependency audit found a new advisory")
    }
  })

  await expect(verifyGate(directory)).resolves.toBeUndefined()
  advisoryPublished = true
  expect(isVerified(directory)).toBe(true)
  await expect(verifyGate(directory)).rejects.toThrow("new advisory")
  expect(audits).toBe(2)
})

/** Construct a disposable token shape at runtime, never a checked-in value. */
function testCredential() {
  return `${["gh", "p"].join("")}_${randomBytes(20).toString("hex")}\n`
}
