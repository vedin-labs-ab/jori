import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, expect, test } from "vitest"
import { sandboxWorkspace } from "../../../contracts/coding"
import { commandWrapperScript, workspaceBootstrapCommand } from "./script"

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true })
  }
})

test("bootstraps the visible workspace", () => {
  const command = workspaceBootstrapCommand()

  expect(spawnSync("bash", ["-n", "-c", command]).status).toBe(0)
  expect(command).toContain(`mkdir -p '${sandboxWorkspace}'`)
  expect(command).toContain(`chmod 755 '${sandboxWorkspace}'`)
})

test("wraps a background command with a bounded, non-fatal callback", () => {
  const script = commandWrapperScript({
    callbackUrl: "https://jori.convex.site/jori/commands",
    command: "echo hello",
    token: "abc123",
  })

  expect(script).toContain(
    `curl -fsS -m 10 -X POST -H 'content-type: application/json' --data '{"token":"abc123"}' 'https://jori.convex.site/jori/commands' >/dev/null 2>&1 || true`
  )
})

test("records the output and exit code of a command that exits", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "jori-command-"))
  roots.push(root)
  const commandDirectory = path.join(root, "command")

  // file:// keeps the callback offline; a callback that cannot be delivered
  // is exactly the case the wrapper has to survive.
  const script = commandWrapperScript({
    callbackUrl: "file:///dev/null",
    command: "echo out\necho err >&2\nexit 7",
    token: "collected",
  }).replaceAll("/tmp/jori/commands/collected", commandDirectory)

  expect(spawnSync("bash", ["-c", script]).status).toBe(0)
  expect(fs.readFileSync(`${commandDirectory}/out`, "utf8")).toBe("out\n")
  expect(fs.readFileSync(`${commandDirectory}/err`, "utf8")).toBe("err\n")
  expect(fs.readFileSync(`${commandDirectory}/exit`, "utf8")).toBe("7")
})
