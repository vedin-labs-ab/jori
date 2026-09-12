import { afterEach, expect, test, vi } from "vitest"
import { assertSandboxRegion, sandboxConnection } from "./connection"

afterEach(() => vi.unstubAllEnvs())

test.each([
  ["eu", "eu-fra-1"],
  ["us", "us-was-1"],
])(
  "pins %s and rejects the other region before execution",
  (region, expected) => {
    vi.stubEnv("JORI_REGION", region)
    vi.stubEnv("BL_API_KEY", "test-key")
    vi.stubEnv("BL_WORKSPACE", "preview")
    const connection = sandboxConnection()
    expect(connection.region).toBe(expected)
    const sandbox = {
      metadata: {
        name: `jori-${region}-opaque`,
        workspace: "preview",
        url: `https://sbx.${expected}.bl.run/preview/sandboxes/test`,
      },
      spec: { region: expected },
    }
    expect(() => assertSandboxRegion(sandbox, connection)).not.toThrow()
    expect(() =>
      assertSandboxRegion(
        {
          ...sandbox,
          spec: { region: region === "eu" ? "us-was-1" : "eu-fra-1" },
        },
        connection
      )
    ).toThrow("region")
    for (const url of [
      "https://run.blaxel.ai/preview/sandboxes/test",
      "https://sbx.eu-fra-1.blaxel.ai.attacker.example",
      "http://sbx.eu-fra-1.blaxel.ai",
    ]) {
      expect(() =>
        assertSandboxRegion(
          { ...sandbox, metadata: { ...sandbox.metadata, url } },
          connection
        )
      ).toThrow("region")
    }
  }
)

test("missing region fails instead of choosing the provider default", () => {
  vi.stubEnv("JORI_REGION", undefined)
  expect(sandboxConnection).toThrow("JORI_REGION")
})
