import { execFileSync, spawnSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "vitest"

test.each(["feature", "detached"])(
  "rejects a %s primary checkout before changing task history",
  (checkout) => {
    const directory = mkdtempSync(path.join(tmpdir(), "jori-land-guard-"))
    const git = (args: string[]) =>
      execFileSync("git", args, {
        cwd: directory,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim()
    try {
      git(["init", "--initial-branch=main"])
      git([
        "-c",
        "user.name=Test",
        "-c",
        "user.email=test@example.com",
        "-c",
        "commit.gpgsign=false",
        "commit",
        "--allow-empty",
        "-m",
        "Initial commit",
      ])
      git(
        checkout === "detached"
          ? ["checkout", "--detach"]
          : ["checkout", "-b", checkout]
      )
      const refs = git(["show-ref"])
      const head = git(["rev-parse", "HEAD"])
      const result = spawnSync(
        process.execPath,
        [
          "--experimental-strip-types",
          fileURLToPath(new URL("./land.ts", import.meta.url)),
          "example",
        ],
        { cwd: directory, encoding: "utf8" }
      )
      expect(result.status).toBe(1)
      expect(result.stderr).toContain("requires main to be checked out")
      expect(git(["show-ref"])).toBe(refs)
      expect(git(["rev-parse", "HEAD"])).toBe(head)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }
)
