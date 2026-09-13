import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { expect, test } from "vitest"
import { createRepository } from "../fixtures"

test.each(["feature", "detached"])(
  "rejects a %s primary checkout before changing task history",
  (checkout) => {
    const { directory, git } = createRepository()

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
  }
)
