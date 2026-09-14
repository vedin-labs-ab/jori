import { ChildProcess, spawn } from "node:child_process"
import { existsSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, expect, test, vi } from "vitest"
import { type Command, runCommands } from "./process"

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>()
  return { ...actual, spawn: vi.fn(actual.spawn) }
})

afterEach(() => vi.mocked(spawn).mockReset())

const directory = mkdtempSync(path.join(tmpdir(), "jori-process-"))

function node(code: string): Command {
  return { args: ["-e", code], command: process.execPath, label: code }
}

test("stops starting commands once one has failed", async () => {
  const marker = path.join(directory, "marker")

  await expect(
    runCommands(
      [
        node("process.exit(1)"),
        node(`require("fs").writeFileSync(${JSON.stringify(marker)}, "")`),
      ],
      1
    )
  ).rejects.toThrow("1 command(s) failed")
  expect(existsSync(marker)).toBe(false)
})

test("runs at most the given number of commands at once", async () => {
  const arrivals = Array.from({ length: 4 }, () => {
    let resolve!: (child: ChildProcess) => void
    const promise = new Promise<ChildProcess>((done) => {
      resolve = done
    })
    return { promise, resolve }
  })
  const active = new Set<ChildProcess>()
  let peak = 0
  let started = 0
  vi.mocked(spawn).mockImplementation(() => {
    const child = new ChildProcess()
    active.add(child)
    peak = Math.max(peak, active.size)
    child.once("exit", () => active.delete(child))
    arrivals[started++].resolve(child)
    return child
  })

  const completed = runCommands(["a", "b", "c", "d"].map(node), 2)
  const [first, second] = await Promise.all(
    arrivals.slice(0, 2).map(({ promise }) => promise)
  )
  expect(started).toBe(2)

  first.emit("exit", 0, null)
  const third = await arrivals[2].promise
  expect(started).toBe(3)

  second.emit("exit", 0, null)
  const fourth = await arrivals[3].promise
  third.emit("exit", 0, null)
  fourth.emit("exit", 0, null)
  await completed

  expect(peak).toBe(2)
  expect(active.size).toBe(0)
})
