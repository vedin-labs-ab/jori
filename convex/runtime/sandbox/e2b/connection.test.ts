import { afterEach, expect, test, vi } from "vitest"
import { sandboxConnection, sandboxTemplate } from "./connection"

afterEach(() => vi.unstubAllEnvs())

test("one E2B connection supports a future isolated deployment domain", () => {
  vi.stubEnv("E2B_API_KEY", "key")
  vi.stubEnv("E2B_DOMAIN", "eu.sandbox.example.com")
  expect(sandboxConnection()).toEqual({
    apiKey: "key",
    domain: "eu.sandbox.example.com",
    apiUrl: "https://api.eu.sandbox.example.com",
  })
  vi.stubEnv("E2B_DOMAIN", "https://bad.example/path")
  expect(sandboxConnection).toThrow("hostname")
})

test("template identity is explicit instead of sharing a default", () => {
  vi.stubEnv("JORI_E2B_TEMPLATE", "")
  expect(sandboxTemplate).toThrow("Missing JORI_E2B_TEMPLATE")
})
