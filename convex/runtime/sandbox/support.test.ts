import { Sandbox } from "e2b"
import { afterEach, expect, test, vi } from "vitest"
import { killSandbox } from "./support"

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

test.each([
  true,
  false,
])("cleanup succeeds for killed or absent sandbox: %s", async (result) => {
  vi.stubEnv("E2B_API_KEY", "test-key")
  const kill = vi.spyOn(Sandbox, "kill").mockResolvedValue(result)
  await expect(killSandbox("test-sandbox")).resolves.toBeUndefined()
  expect(kill).toHaveBeenCalledWith(
    "test-sandbox",
    expect.objectContaining({ apiKey: "test-key" })
  )
})

test("cleanup failure is actionable without copying sensitive provider text", async () => {
  vi.stubEnv("E2B_API_KEY", "secret-test-key")
  vi.spyOn(Sandbox, "kill").mockRejectedValue(
    new Error("secret-test-key private-sandbox-metadata")
  )
  await expect(killSandbox("test-sandbox")).rejects.toThrow(
    "Sandbox cleanup failed. Check this deployment's E2B connection and retry cleanup."
  )
})

test("missing deployment credentials fail without an E2B request", async () => {
  vi.stubEnv("E2B_API_KEY", undefined)
  const kill = vi.spyOn(Sandbox, "kill")
  await expect(killSandbox("test-sandbox")).rejects.toThrow(
    "Missing E2B_API_KEY"
  )
  expect(kill).not.toHaveBeenCalled()
})
