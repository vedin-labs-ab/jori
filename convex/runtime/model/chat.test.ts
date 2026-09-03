import { describe, expect, test } from "vitest"
import { createOpenRouterModelSettings } from "./openrouter"

describe("OpenRouter model runtime settings", () => {
  test("uses low reasoning for the first turn (the start update)", () => {
    expect(createOpenRouterModelSettings(true)).toEqual({
      provider: {
        require_parameters: true,
      },
      reasoning: {
        effort: "low",
      },
    })
  })

  test("uses medium reasoning for the rest of the run", () => {
    expect(createOpenRouterModelSettings(false)).toEqual({
      provider: {
        require_parameters: true,
      },
      reasoning: {
        effort: "medium",
      },
    })
  })
})
