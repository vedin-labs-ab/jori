import { describe, expect, test } from "vitest"
import { createOpenRouterModelSettings } from "./openrouter"

describe("OpenRouter model runtime settings", () => {
  test("uses hard-coded provider routing and reasoning for agent calls", () => {
    expect(createOpenRouterModelSettings()).toEqual({
      provider: {
        require_parameters: true,
        sort: "price",
      },
      reasoning: {
        effort: "xhigh",
      },
    })
  })
})
