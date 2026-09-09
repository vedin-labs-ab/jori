import { describe, expect, test } from "vitest"
import { integrationDoc } from "../../../test/convex/integrations"
import { type Doc } from "../../_generated/dataModel"
import { requireGitHubCredentials } from "../github/credentials"
import { requireGoogleCredentials } from "../google/credentials"

describe("provider credentials", () => {
  test("reads required and optional fields", () => {
    expect(
      requireGoogleCredentials(
        integration({
          tokens: {
            access: "access-token",
            refresh: "refresh-token",
          },
          expiresAt: 123,
          scope: "email profile",
        })
      )
    ).toEqual({
      tokens: {
        access: "access-token",
        refresh: "refresh-token",
      },
      expiresAt: 123,
      scope: "email profile",
    })
  })

  test("ignores optional fields with the wrong type", () => {
    expect(
      requireGitHubCredentials(
        integration({
          installationId: "installation",
          tokens: { access: 123 },
          expiresAt: "tomorrow",
        })
      )
    ).toEqual({
      installationId: "installation",
      tokens: undefined,
      expiresAt: undefined,
    })
  })

  test("throws the provider error when required fields are missing", () => {
    expect(() => requireGoogleCredentials(integration({}))).toThrow(
      "Missing Google Workspace integration credentials"
    )
  })
})

function integration(credentials: unknown): Doc<"integrations"> {
  return integrationDoc({
    integration: "gmail",
    scope: "user",
    credentials: credentials as Doc<"integrations">["credentials"],
  })
}
