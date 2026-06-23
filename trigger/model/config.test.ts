import { afterEach, describe, expect, test } from "vitest"
import {
  requireAgentModelProvider,
  requireBasetenRuntimeConfig,
} from "./config"

const environmentNames = [
  "BASETEN_API_KEY",
  "MILO_AGENT_MODEL_PROVIDER",
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

  test("uses OpenRouter by default", () => {
    delete process.env.MILO_AGENT_MODEL_PROVIDER

    expect(requireAgentModelProvider()).toBe("openrouter")
  })

  test("allows Baseten as the agent model provider", () => {
    process.env.MILO_AGENT_MODEL_PROVIDER = " baseten "

    expect(requireAgentModelProvider()).toBe("baseten")
  })

  test("rejects unsupported agent model providers", () => {
    process.env.MILO_AGENT_MODEL_PROVIDER = "zai"

    expect(() => requireAgentModelProvider()).toThrow(
      "Unsupported MILO_AGENT_MODEL_PROVIDER: zai"
    )
  })

  test("requires a Baseten API key", () => {
    delete process.env.BASETEN_API_KEY

    expect(() => requireBasetenRuntimeConfig()).toThrow(
      "Missing BASETEN_API_KEY"
    )
  })

  test("reads Baseten runtime settings", () => {
    process.env.BASETEN_API_KEY = " key "

    expect(requireBasetenRuntimeConfig()).toEqual({
      apiKey: "key",
      endpoint: "https://inference.baseten.co/v1/chat/completions",
      model: "zai-org/GLM-5.2",
    })
  })
})
