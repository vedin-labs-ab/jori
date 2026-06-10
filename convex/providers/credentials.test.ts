import { describe, expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { requireGitHubCredentials } from "./github/credentials"
import { requireGoogleCredentials } from "./google/credentials"

describe("provider credentials", () => {
  test("reads required and optional fields", () => {
    expect(
      requireGoogleCredentials(
        integration({
          accessToken: "access-token",
          refreshToken: "refresh-token",
          expiresAt: 123,
          scope: "email profile",
        })
      )
    ).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: 123,
      scope: "email profile",
    })
  })

  test("ignores optional fields with the wrong type", () => {
    expect(
      requireGitHubCredentials(
        integration({
          installationId: "installation",
          token: 123,
          expiresAt: "tomorrow",
        })
      )
    ).toEqual({
      installationId: "installation",
      token: undefined,
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
  return {
    _id: "integration",
    _creationTime: 0,
    tenantId: "tenant",
    provider: "gmail",
    scope: "tenant",
    accountId: "account",
    credentials,
    status: "active",
    createdAt: 0,
  } as Doc<"integrations">
}
