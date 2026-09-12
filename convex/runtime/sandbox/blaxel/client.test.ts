import { SandboxInstance } from "@blaxel/core"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { connectSandbox, killSandbox, sandboxCleanupFailure } from "./client"

beforeEach(() => {
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("BL_API_KEY", "secret-test-key")
  vi.stubEnv("BL_WORKSPACE", "preview-eu")
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

test("a foreign region is rejected before querying the provider", async () => {
  const get = vi.spyOn(SandboxInstance, "get")
  await expect(connectSandbox("jori-us-foreign")).rejects.toThrow("region")
  expect(get).not.toHaveBeenCalled()
})

test("cleanup tolerates an absent sandbox", async () => {
  vi.spyOn(SandboxInstance, "get").mockRejectedValue({ code: 404 })
  await expect(killSandbox("jori-eu-missing")).resolves.toBeUndefined()
})

test("cleanup failures omit provider secrets and cannot be marked successful", async () => {
  vi.spyOn(SandboxInstance, "get").mockRejectedValue(
    new Error("secret-test-key private-metadata")
  )
  await expect(killSandbox("jori-eu-test")).rejects.toThrow(
    sandboxCleanupFailure
  )
})

test("missing credentials fail without a provider request", async () => {
  vi.stubEnv("BL_API_KEY", undefined)
  const get = vi.spyOn(SandboxInstance, "get")
  await expect(killSandbox("jori-eu-test")).rejects.toThrow(
    "Missing BL_API_KEY"
  )
  expect(get).not.toHaveBeenCalled()
})
