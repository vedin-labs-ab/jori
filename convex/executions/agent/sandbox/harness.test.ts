import { expect, test } from "vitest"
import { runtimeAssets } from "../../../runtime/_generated/assets"
import { batchSandboxWrites, sandboxWriteBatchBytes } from "./files"
import {
  createBootstrapCommand,
  createCodexCommand,
  createImageCheckCommand,
  createTraceServerCommand,
  traceFile,
  tracePort,
} from "./harness"

test("disables Codex Apps for sandbox runs", () => {
  expect(createCodexCommand()).toContain("--disable apps")
})

test("lets Codex write artifact drafts inside the E2B workspace", () => {
  expect(createCodexCommand()).toContain("--sandbox workspace-write")
})

test("tees the Codex trace to the file the live server tails", () => {
  const command = createCodexCommand()

  expect(command).toContain(`| tee "${traceFile}"`)
  expect(command).toContain("set -euo pipefail")
  expect(command).toContain("< /tmp/milo-prompt.md")
  expect(command).not.toContain("MILO_CODEX_PROMPT_BASE64")
  expect(command.length).toBeLessThan(500)
})

test("bootstrap launches uploaded runtime source with a small command", () => {
  const command = createBootstrapCommand()

  expect(command).toContain("/tmp/milo-bootstrap.ts")
  expect(command).toContain("node --experimental-strip-types")
  expect(command).not.toContain(
    Buffer.from(runtimeAssets.sandbox.bootstrap).toString("base64")
  )
  expect(command).not.toContain("MILO_SANDBOX_FILES_BASE64")
  expect(command.length).toBeLessThan(200)
})

test("trace server requires the viewer token and serves SSE", () => {
  const command = createTraceServerCommand()

  expect(command).toContain(`touch "${traceFile}"`)
  expect(runtimeAssets.sandbox.traceServer).toContain("MILO_TRACE_TOKEN")
  expect(command).toContain(`MILO_TRACE_PORT="${tracePort}"`)
  expect(command).toContain("/tmp/milo-trace-server.ts")
  expect(command).toContain("node --experimental-strip-types")
  expect(command).not.toContain(
    Buffer.from(runtimeAssets.sandbox.traceServer).toString("base64")
  )
  expect(command).not.toContain("base64 -d")
  expect(command.length).toBeLessThan(300)
})

test("image checks launch the checked runtime source", () => {
  const command = createImageCheckCommand()

  expect(command).toContain(
    Buffer.from(runtimeAssets.sandbox.imageCheck).toString("base64")
  )
  expect(command).toContain(
    'node --experimental-strip-types "/home/user/milo-workspace/.milo-image-check.ts"'
  )
})

test("batches large sandbox filesystem writes outside command env", () => {
  const files = [
    { path: "/tmp/a", data: "a".repeat(sandboxWriteBatchBytes - 16) },
    { path: "/tmp/b", data: "b".repeat(64) },
  ]

  expect(batchSandboxWrites(files)).toEqual([[files[0]], [files[1]]])
})
