import { describe, expect, test } from "vitest"
import { runtimeAssets } from "../../../../runtime/_generated/assets"
import { createTokenPreflightCommand } from "./script"

describe("token preflight command", () => {
  test("wraps the checked preflight script with typed config", () => {
    const command = createTokenPreflightCommand({
      tokenEnv: "MILO_EXAMPLE_TOKEN",
      missingTokenError: "Missing Example token",
      url: "https://api.example.com/me",
      headers: { "x-example-version": "2026-01-01" },
      failureLabel: "Example token",
      successMessage: "Example token preflight passed",
    })

    expect(command).not.toContain("node <<")
    expect(command).toContain("MILO_PREFLIGHT_CONFIG_BASE64")
    expect(command).toContain("/tmp/milo-token-preflight.ts")
    expect(command).toContain("node --experimental-strip-types")
    expect(command).toContain(
      Buffer.from(runtimeAssets.sandbox.tokenPreflight).toString("base64")
    )
    expect(readExportedConfig(command)).toMatchObject({
      tokenEnv: "MILO_EXAMPLE_TOKEN",
      missingTokenError: "Missing Example token",
      url: "https://api.example.com/me",
      headers: { "x-example-version": "2026-01-01" },
      failureLabel: "Example token",
      successMessage: "Example token preflight passed",
    })
  })

  test("passes POST body and typed failure properties as data", () => {
    const command = createTokenPreflightCommand({
      tokenEnv: "MILO_EXAMPLE_TOKEN",
      missingTokenError: "Missing Example token",
      url: () => "https://api.example.com/graphql",
      body: { query: "{ viewer { id } }" },
      failureBodyProperties: ["errors"],
      failureLabel: "Example token",
      successMessage: "Example token preflight passed",
    })

    expect(readExportedConfig(command)).toMatchObject({
      url: "https://api.example.com/graphql",
      body: { query: "{ viewer { id } }" },
      failureBodyProperties: ["errors"],
    })
    expect(command).not.toContain("body.errors")
  })
})

function readExportedConfig(command: string) {
  const match = /MILO_PREFLIGHT_CONFIG_BASE64="([^"]+)"/.exec(command)

  if (match === null) {
    throw new Error("Missing preflight config export.")
  }

  return JSON.parse(Buffer.from(match[1], "base64").toString("utf8"))
}
