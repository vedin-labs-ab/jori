import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { packageCommand } from "../process.ts"

/** Cached code checks must not hide a different local toolchain from CI. */
export function requireRuntime() {
  if (process.versions.node.split(".")[0] !== "24") {
    throw new Error("Verification requires Node.js 24, matching GitHub Check.")
  }

  const { packageManager } = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8")
  ) as { packageManager: string }
  const expected = packageManager.replace(/^pnpm@/, "").split("+")[0]
  const command = packageCommand("--version")
  const result = spawnSync(command.command, command.args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })

  if (result.status !== 0 || result.stdout.trim() !== expected) {
    throw new Error(
      `Verification requires pnpm ${expected}, matching packageManager and GitHub Check.`
    )
  }
}
