import { describe, expect, test } from "vitest"
import { createOpenRouterModelSettings } from "./openrouter"

describe("OpenRouter model runtime settings", () => {
  test("uses hard-coded provider routing and reasoning for agent calls", () => {
    expect(createOpenRouterModelSettings()).toEqual({
      provider: {
        allow_fallbacks: true,
        only: ["Wafer", "Z.AI", "Fireworks", "Together"],
        order: ["Wafer", "Z.AI", "Fireworks", "Together"],
        require_parameters: true,
      },
      reasoning: {
        effort: "xhigh",
      },
    })
  })
})
