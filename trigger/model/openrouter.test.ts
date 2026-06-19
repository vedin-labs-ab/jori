import { describe, expect, test } from "vitest"
import { createOpenRouterModelSettings } from "./openrouter"

describe("OpenRouter model runtime settings", () => {
  test("prioritizes low-price providers for agent calls", () => {
    expect(createOpenRouterModelSettings(undefined)).toEqual({
      provider: {
        require_parameters: true,
        sort: "price",
      },
    })
  })

  test("keeps GLM reasoning effort when configured", () => {
    expect(createOpenRouterModelSettings("xhigh")).toEqual({
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
