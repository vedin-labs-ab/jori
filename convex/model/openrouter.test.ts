import { afterEach, describe, expect, test } from "vitest"
import { requireOpenRouterConfig } from "./openrouter"

const environmentNames = [
  "CONVEX_SITE_URL",
  "OPENROUTER_API_KEY",
  "OPENROUTER_APP_CATEGORIES",
  "OPENROUTER_APP_TITLE",
  "OPENROUTER_HTTP_REFERER",
] as const

const originalEnvironment = new Map(
  environmentNames.map((name) => [name, process.env[name]])
)

describe("openrouter client", () => {
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

  test("requires an API key", () => {
    delete process.env.OPENROUTER_API_KEY

    expect(() => requireOpenRouterConfig()).toThrow(
      "Missing OPENROUTER_API_KEY"
    )
  })

  test("reads API key and default attribution", () => {
    process.env.OPENROUTER_API_KEY = " key "
    process.env.CONVEX_SITE_URL = " https://milo.example "
    delete process.env.OPENROUTER_APP_CATEGORIES
    delete process.env.OPENROUTER_APP_TITLE
    delete process.env.OPENROUTER_HTTP_REFERER

    expect(requireOpenRouterConfig()).toEqual({
      apiKey: "key",
      appCategories: "cloud-agent",
      appTitle: "Milo",
      httpReferer: "https://milo.example",
    })
  })

  test("allows OpenRouter attribution overrides", () => {
    process.env.OPENROUTER_API_KEY = "key"
    process.env.CONVEX_SITE_URL = "https://convex.example"
    process.env.OPENROUTER_APP_CATEGORIES = "automation"
    process.env.OPENROUTER_APP_TITLE = "Custom Milo"
    process.env.OPENROUTER_HTTP_REFERER = "https://app.example"

    expect(requireOpenRouterConfig()).toEqual({
      apiKey: "key",
      appCategories: "automation",
      appTitle: "Custom Milo",
      httpReferer: "https://app.example",
    })
  })
})
