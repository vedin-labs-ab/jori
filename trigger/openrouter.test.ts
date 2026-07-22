import { afterEach, describe, expect, test, vi } from "vitest"
import { requireOpenRouterRuntimeConfig } from "./openrouter"

describe("agent model runtime config", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test("requires an OpenRouter API key", () => {
    vi.stubEnv("OPENROUTER_API_KEY", undefined)

    expect(() => requireOpenRouterRuntimeConfig()).toThrow(
      "Missing OPENROUTER_API_KEY"
    )
  })

  test("reads OpenRouter runtime settings with defaults", () => {
    vi.stubEnv("OPENROUTER_API_KEY", " key ")
    vi.stubEnv("OPENROUTER_APP_TITLE", undefined)
    vi.stubEnv("OPENROUTER_HTTP_REFERER", undefined)
    vi.stubEnv("CONVEX_SITE_URL", undefined)
    vi.stubEnv("VITE_CONVEX_SITE_URL", undefined)

    expect(requireOpenRouterRuntimeConfig()).toEqual({
      apiKey: "key",
      appName: "Milo",
      appUrl: undefined,
    })
  })
})
