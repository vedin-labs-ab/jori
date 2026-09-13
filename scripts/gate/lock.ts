import { readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

/**
 * Serializes the heavy gates, the check set and the full suite, across every
 * worktree of this repository on one machine. Two gates at once oversubscribe
 * the CPU and, on 16 GB, swap; queued they finish sooner in total, and the
 * partial runs agents make meanwhile stay fast. The lock is a file in the
 * system temp dir keyed by repository name, naming who holds it, so a waiter
 * can say whose gate it is waiting for.
 *
 * The holder passes itself to its children in JORI_GATE_HOLDER, so `land`
 * can hold the lock from rebase to merge while the check and test it runs
 * inside acquire nothing.
 */
const holderVariable = "JORI_GATE_HOLDER"
const pollMs = 2_000
/** How long an unreadable lock may be a holder still writing its record. */
const settleMs = 10_000

export type Holder = { pid: number; cwd: string; startedAt: number }

/** Waits for the lock and returns the function that releases it. */
export async function acquireLock(file = defaultLockFile()) {
  if (Number(process.env[holderVariable]) === readHolder(file)?.pid) {
    return () => undefined
  }

  let announced = false

  for (;;) {
    try {
      writeFileSync(file, JSON.stringify(holder()), { flag: "wx" })
      process.env[holderVariable] = String(process.pid)

      return () => releaseLock(file)
    } catch {
      const current = readHolder(file)

      if (isStale(current, file)) {
        rmSync(file, { force: true })
        continue
      }

      if (!announced && current !== undefined) {
        announced = true
        process.stderr.write(
          `Another gate has been running in ${current.cwd} for ${age(current)}. Gates take a few minutes; this one starts by itself when that finishes.\n`
        )
      }

      await new Promise((resolve) => setTimeout(resolve, pollMs))
    }
  }
}

function defaultLockFile() {
  return path.join(tmpdir(), "jori-gate.lock")
}

function holder(): Holder {
  return { pid: process.pid, cwd: process.cwd(), startedAt: Date.now() }
}

function age(current: Holder) {
  return `${Math.round((Date.now() - current.startedAt) / 1000)}s`
}

/** A lock whose process no longer exists is stale (crashed or killed gate).
 *  One that cannot be read is a holder between creating the file and
 *  writing its record, unless it has stayed unreadable past any such gap. */
function isStale(current: Holder | undefined, file: string) {
  if (current === undefined) {
    try {
      return Date.now() - statSync(file).mtimeMs > settleMs
    } catch {
      return true
    }
  }

  try {
    process.kill(current.pid, 0)

    return false
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "EPERM"
  }
}

function readHolder(file: string): Holder | undefined {
  try {
    const record = JSON.parse(readFileSync(file, "utf8")) as Partial<Holder>
    const { pid } = record

    return typeof pid === "number" && Number.isInteger(pid) && pid > 0
      ? (record as Holder)
      : undefined
  } catch {
    return undefined
  }
}

function releaseLock(file: string) {
  delete process.env[holderVariable]

  if (readHolder(file)?.pid === process.pid) {
    rmSync(file, { force: true })
  }
}
