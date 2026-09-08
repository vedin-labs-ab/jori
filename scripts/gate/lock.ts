import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

/**
 * Serializes the test gate across every worktree of this repository on one
 * machine. Full suites concurrently oversubscribe the CPU (each spawns a
 * worker per core), which starves per-test wall-clock budgets and turns
 * sound tests flaky; queueing them is also faster in total than letting
 * them thrash. The lock lives in the system temp dir, keyed by repository
 * name, so all worktrees contend on the same one.
 */
const lockDirectory = path.join(tmpdir(), "jori-gate.lock")
const pidFile = path.join(lockDirectory, "pid")
const pollMs = 2_000

/** Waits for the lock and returns the function that releases it. */
export async function acquireLock() {
  let announced = false

  for (;;) {
    try {
      mkdirSync(lockDirectory)
      writeFileSync(pidFile, String(process.pid))

      return releaseLock
    } catch {
      if (holderIsDead()) {
        rmSync(lockDirectory, { force: true, recursive: true })
        continue
      }

      if (!announced) {
        announced = true
        process.stderr.write(
          "Another test gate is running on this machine; waiting for it.\n"
        )
      }

      await new Promise((resolve) => setTimeout(resolve, pollMs))
    }
  }
}

/** A lock whose recorded process no longer exists is stale (crashed or
 *  killed gate); an unreadable pid file counts as stale too. */
function holderIsDead() {
  try {
    const pid = Number(readFileSync(pidFile, "utf8"))

    if (!Number.isInteger(pid) || pid <= 0) {
      return true
    }

    process.kill(pid, 0)

    return false
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "EPERM"
  }
}

function releaseLock() {
  try {
    if (Number(readFileSync(pidFile, "utf8")) === process.pid) {
      rmSync(lockDirectory, { force: true, recursive: true })
    }
  } catch {
    // Already released or stolen as stale; nothing to clean up.
  }
}
