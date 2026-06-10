import { expect, test } from "vitest"
import { createCodexCommand } from "./harness"

test("disables Codex Apps for sandbox runs", () => {
  expect(createCodexCommand()).toContain("--disable apps")
})

test("runs Codex read-only, leaving E2B as the network boundary", () => {
  expect(createCodexCommand()).toContain("--sandbox read-only")
})
