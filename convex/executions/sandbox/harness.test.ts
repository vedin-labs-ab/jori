import { expect, test } from "vitest"
import {
  createCodexCommand,
  createTraceServerCommand,
  traceFile,
  tracePort,
} from "./harness"

test("disables Codex Apps for sandbox runs", () => {
  expect(createCodexCommand()).toContain("--disable apps")
})

test("runs Codex read-only, leaving E2B as the network boundary", () => {
  expect(createCodexCommand()).toContain("--sandbox read-only")
})

test("tees the Codex trace to the file the live server tails", () => {
  const command = createCodexCommand()

  expect(command).toContain(`| tee "${traceFile}"`)
  expect(command).toContain("set -euo pipefail")
})

test("trace server requires the viewer token and serves SSE", () => {
  const command = createTraceServerCommand()

  expect(command).toContain(`touch "${traceFile}"`)
  expect(command).toContain("MILO_TRACE_TOKEN")
  expect(command).toContain("text/event-stream")
  expect(command).toContain(`listen(${tracePort})`)
})
