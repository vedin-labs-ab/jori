import { expect, test } from "vitest"
import { createCodexCommand } from "./harness"

test("disables Codex Apps for sandbox runs", () => {
  expect(createCodexCommand()).toContain("--disable apps")
})

test("relies on E2B isolation instead of the Codex sandbox", () => {
  expect(createCodexCommand()).toContain("--sandbox danger-full-access")
})
