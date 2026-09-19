import { spawnSync } from "node:child_process"
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, expect, test, vi } from "vitest"
import { createRepository } from "../fixtures"
import { installHooks } from "./hooks"
import { verifyPush } from "./push"

const runCommand = vi.hoisted(() => vi.fn(async () => {}))
vi.mock("../process.ts", async (original) => ({
  ...(await original<object>()),
  runCommand,
}))
beforeEach(() => runCommand.mockReset())

const zero = "0".repeat(40)
const update = (revision: string) =>
  `refs/heads/main ${revision} refs/heads/main ${zero}\n`

test("pushes run the shared gate, and propagate a failure before Git sends objects", async () => {
  const { directory, git } = createRepository()
  const head = git(["rev-parse", "HEAD"])
  runCommand.mockRejectedValueOnce(new Error("Security check failed"))
  await expect(verifyPush(update(head), directory)).rejects.toThrow(
    "Security check failed"
  )
  expect(runCommand).toHaveBeenCalledWith(
    expect.objectContaining({ args: ["verify"], cwd: directory })
  )
})

test("a dirty checkout or another outgoing commit cannot reuse this tree's verification", async () => {
  const { directory, git } = createRepository()
  const previous = git(["rev-parse", "HEAD"])
  writeFileSync(path.join(directory, "file.txt"), "change\n")
  await expect(verifyPush(update(previous), directory)).rejects.toThrow(
    "Commit or stash"
  )
  git(["add", "."])
  git(["commit", "-m", "Change"])
  await expect(verifyPush(update(previous), directory)).rejects.toThrow(
    "checked-out commit only"
  )
  expect(runCommand).not.toHaveBeenCalled()
})

test("annotated tags for HEAD use the shared gate; deletion-only pushes need no code gate", async () => {
  const { directory, git } = createRepository()
  git(["tag", "-a", "release", "-m", "Release"])
  await verifyPush(update(git(["rev-parse", "release"])), directory)
  expect(runCommand).toHaveBeenCalledTimes(1)
  await verifyPush(update(zero), directory)
  expect(runCommand).toHaveBeenCalledTimes(1)
})

test("a checkout changed during the gate cannot be pushed", async () => {
  const { directory, git } = createRepository()
  runCommand.mockImplementationOnce(async () => {
    writeFileSync(path.join(directory, "file.txt"), "concurrent change\n")
  })
  await expect(
    verifyPush(update(git(["rev-parse", "HEAD"])), directory)
  ).rejects.toThrow("checkout changed")
})

test("hook setup is repeatable and preserves a different configured hook directory", () => {
  const { directory, git } = createRepository()
  installHooks(directory)
  installHooks(directory)
  expect(git(["config", "--get", "core.hooksPath"])).toBe(".githooks")
  git(["config", "core.hooksPath", "custom-hooks"])
  expect(() => installHooks(directory)).toThrow("already use custom-hooks")
  expect(git(["config", "--get", "core.hooksPath"])).toBe("custom-hooks")
})

test("the installed Git hook blocks a real push when the shared gate fails", () => {
  const { directory, git } = createRepository()
  mkdirSync(path.join(directory, "scripts/gate"), { recursive: true })
  mkdirSync(path.join(directory, ".githooks"))
  for (const file of ["gate/push.ts", "git.ts", "process.ts"]) {
    copyFileSync(
      new URL(`../${file}`, import.meta.url),
      path.join(directory, "scripts", file)
    )
  }
  copyFileSync(
    new URL("../../.githooks/pre-push", import.meta.url),
    path.join(directory, ".githooks/pre-push")
  )
  git(["add", "."])
  git(["commit", "-m", "Install gate fixture"])
  installHooks(directory)
  const remote = path.join(directory, ".git/remote.git")
  git(["init", "--bare", remote])
  const bin = path.join(directory, ".git/bin")
  mkdirSync(bin)
  writeFileSync(
    path.join(bin, "pnpm"),
    '#!/bin/sh\n[ "$1" = verify ] || exit 42\necho "fixture gate rejected" >&2\nexit 1\n',
    { mode: 0o755 }
  )
  const pushed = spawnSync("git", ["push", remote, "HEAD:main"], {
    cwd: directory,
    encoding: "utf8",
    env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` },
  })
  expect(pushed.status).not.toBe(0)
  expect(pushed.stderr).toContain("fixture gate rejected")
  expect(() =>
    git(["--git-dir", remote, "show-ref", "--verify", "refs/heads/main"])
  ).toThrow()
})
