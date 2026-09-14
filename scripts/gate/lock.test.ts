import { spawnSync } from "node:child_process"
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, expect, test, vi } from "vitest"
import { acquireLock, type Holder } from "./lock"

const directory = mkdtempSync(path.join(tmpdir(), "jori-lock-"))
const file = path.join(directory, "lock")

afterEach(() => {
  vi.useRealTimers()
  rmSync(file, { force: true })
  delete process.env.JORI_GATE_HOLDER
})

function record(holder: Partial<Holder>) {
  writeFileSync(
    file,
    JSON.stringify({ cwd: "/elsewhere", startedAt: Date.now(), ...holder })
  )
}

function holder() {
  return JSON.parse(readFileSync(file, "utf8")) as Holder
}

test("takes over a lock whose holder is gone, and releases its own", async () => {
  record({ pid: spawnSync(process.execPath, ["-e", ""]).pid })

  const release = await acquireLock(file)

  expect(holder().pid).toBe(process.pid)
  expect(process.env.JORI_GATE_HOLDER).toBe(String(process.pid))
  release()
  expect(existsSync(file)).toBe(false)
  expect(process.env.JORI_GATE_HOLDER).toBeUndefined()
})

test("a child of the holder acquires nothing and releases nothing", async () => {
  record({ pid: process.ppid })
  process.env.JORI_GATE_HOLDER = String(process.ppid)

  const release = await acquireLock(file)

  release()
  expect(holder().pid).toBe(process.ppid)
})

test("waits for a fresh lock whose record is still being written", async () => {
  vi.useFakeTimers()
  writeFileSync(file, "")

  const acquired = acquireLock(file).then((release) => {
    release()
    return true
  })

  await vi.advanceTimersToNextTimerAsync()
  expect(readFileSync(file, "utf8")).toBe("")

  rmSync(file)
  await vi.advanceTimersToNextTimerAsync()
  expect(await acquired).toBe(true)
})
