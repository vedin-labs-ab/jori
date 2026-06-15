import { expect, test } from "vitest"
import { createCodexConfig } from "./codex"

test("omits hosted web search when disabled", () => {
  const config = createCodexConfig({
    mcpServers: [],
    webSearch: false,
  })

  expect(config).not.toContain("web_search")
  expect(config).toContain('sandbox_mode = "read-only"')
})
