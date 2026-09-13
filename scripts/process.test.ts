import { appendFileSync, existsSync, mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { expect, test } from "vitest"
import { type Command, runCommands } from "./process"

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
  const log = path.join(directory, "log")
  const step = (name: string) =>
    node(
      `const fs = require("fs"); fs.appendFileSync(${JSON.stringify(log)}, "start ${name}\\n"); setTimeout(() => fs.appendFileSync(${JSON.stringify(log)}, "end ${name}\\n"), 200)`
    )

  appendFileSync(log, "")
  await runCommands(["a", "b", "c", "d"].map(step), 2)

  let running = 0
  let peak = 0
  for (const line of readFileSync(log, "utf8").trim().split("\n")) {
    running += line.startsWith("start") ? 1 : -1
    peak = Math.max(peak, running)
  }
  expect(peak).toBe(2)
})
