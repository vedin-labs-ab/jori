import { spawn } from "node:child_process"
import { acquireLock } from "./gate/lock.ts"
import { recordGate } from "./gate/stamp.ts"

/** The test gate: the whole suite under the machine-wide lock. A run with
 *  arguments is a partial run, so only the bare gate records a pass. */
const testArguments = process.argv.slice(2)
const release = await acquireLock()
const child = spawn("vitest", ["run", ...testArguments], { stdio: "inherit" })

child.on("exit", (code, signal) => {
  release()

  if (code === 0 && testArguments.length === 0) {
    recordGate("test")
  }

  process.exitCode = signal === null ? (code ?? 1) : 1
})

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    child.kill(signal)
    release()
    process.exit(1)
  })
}
