import { expect, test } from "vitest"
import { createCodexCommand } from "./harness"

test("disables Codex Apps for sandbox runs", () => {
  expect(createCodexCommand()).toContain("--disable apps")
})
