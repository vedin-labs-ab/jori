import { afterEach, describe, expect, test } from "vitest"
import { requireOpenRouterRuntimeConfig } from "./config"

const environmentNames = [
  "OPENROUTER_API_KEY",
  "OPENROUTER_APP_TITLE",
  "OPENROUTER_HTTP_REFERER",
  "CONVEX_SITE_URL",
  "VITE_CONVEX_SITE_URL",
] as const

const originalEnvironment = new Map(
  environmentNames.map((name) => [name, process.env[name]])
)

describe("agent model runtime config", () => {
  afterEach(() => {
    for (const name of environmentNames) {
      const value = originalEnvironment.get(name)

      if (value === undefined) {
        delete process.env[name]
      } else {
        process.env[name] = value
      }
    }
  })

  test("requires an OpenRouter API key", () => {
    delete process.env.OPENROUTER_API_KEY

    expect(() => requireOpenRouterRuntimeConfig()).toThrow(
      "Missing OPENROUTER_API_KEY"
    )
  })

  test("reads OpenRouter runtime settings with defaults", () => {
    process.env.OPENROUTER_API_KEY = " key "
    delete process.env.OPENROUTER_APP_TITLE
    delete process.env.OPENROUTER_HTTP_REFERER
    delete process.env.CONVEX_SITE_URL
    delete process.env.VITE_CONVEX_SITE_URL

    expect(requireOpenRouterRuntimeConfig()).toEqual({
      apiKey: "key",
      appName: "Milo",
      appUrl: undefined,
    })
  })
})
