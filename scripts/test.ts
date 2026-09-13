import { spawn } from "node:child_process"
import { acquireLock } from "./gate/lock.ts"
import { recordGate } from "./gate/stamp.ts"
import { treeHash } from "./git.ts"

/**
 * The test gate: the whole suite under the machine-wide lock, and only that
 * bare run records a pass. A run with arguments is an agent's inner loop,
 * seconds of work on two workers, so it skips the lock rather than queue
 * minutes behind another worktree's gate.
 */
const testArguments = process.argv.slice(2)
const partial = testArguments.length > 0
const tree = treeHash()
const release = partial ? () => undefined : await acquireLock()
const child = spawn(
  "vitest",
  ["run", ...(partial ? ["--maxWorkers=2"] : []), ...testArguments],
  { stdio: "inherit" }
)

child.on("exit", (code, signal) => {
  release()

  if (code === 0 && !partial) {
    recordGate("test", tree)
  }

  process.exitCode = signal === null ? (code ?? 1) : 1
})

// Forward the signal and let the exit handler release the lock once the
// workers are actually gone, instead of freeing it while they still run.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => child.kill(signal))
}
