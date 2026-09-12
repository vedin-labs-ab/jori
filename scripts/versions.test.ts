import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "vitest"

const script = fileURLToPath(new URL("./versions.ts", import.meta.url))
const manager = "---\npackages:\n  pnpm@12.4.1: {}\nsnapshots: {}\n---\n"

function check(lockfile: string) {
  const directory = mkdtempSync(join(tmpdir(), "jori-versions-"))
  try {
    writeFileSync(join(directory, "pnpm-lock.yaml"), lockfile)
    return spawnSync(process.execPath, ["--experimental-strip-types", script], {
      cwd: directory,
      encoding: "utf8",
    })
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

test("checks app dependencies after the package manager YAML document", () => {
  const result = check(`${manager}packages:
  react@19.3.0: {}
  '@radix-ui/react-dialog@1.1.23': {}
snapshots: {}
`)
  expect(result.status).toBe(0)
  expect(result.stdout).toContain("3 packages scanned")
})

test.each(["", manager])(
  "rejects duplicate React and Radix instances across lockfile layouts: %j",
  (prefix) => {
    const result = check(`${prefix}packages:
  react@19.2.7: {}
  react@19.3.0: {}
  '@radix-ui/react-dialog@1.1.22': {}
  '@radix-ui/react-dialog@1.1.23': {}
snapshots: {}
`)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("react: 19.2.7, 19.3.0")
    expect(result.stderr).toContain("@radix-ui/react-dialog: 1.1.22, 1.1.23")
  }
)
