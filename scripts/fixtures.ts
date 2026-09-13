import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach } from "vitest"

const directories: string[] = []

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

/** A throwaway repository with one commit on `main`, removed after the
 *  test, and a `git` bound to it that never signs or asks who you are. */
export function createRepository() {
  const directory = mkdtempSync(path.join(tmpdir(), "jori-git-"))
  const git = (args: string[]) =>
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Test",
        "-c",
        "user.email=test@example.com",
        "-c",
        "commit.gpgsign=false",
        ...args,
      ],
      { cwd: directory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    ).trim()

  directories.push(directory)
  git(["init", "--initial-branch=main"])
  git(["commit", "--allow-empty", "-m", "Initial commit"])

  return { directory, git }
}
