import { spawnSync } from "node:child_process"
import { type Target } from "./names.ts"
import { loadTarget } from "./target.ts"

/** Runs one command inside a target's environment and exits with its
 *  status, so a wrapper is transparent to whatever called it. */
export function runInTarget(target: Target, command: readonly string[]): never {
  const [program, ...args] = command

  if (program === undefined) {
    throw new Error("A command to run is required.")
  }

  const result = spawnSync(program, args, {
    env: loadTarget(target),
    stdio: "inherit",
  })

  if (result.error !== undefined) {
    throw result.error
  }

  process.exit(result.status ?? 1)
}
