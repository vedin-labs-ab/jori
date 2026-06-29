import { describe, expect, test } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import { requireGitHubCredentials } from "./github/credentials"
import { requireGoogleCredentials } from "./google/credentials"

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
  return {
    _id: "integration",
    _creationTime: 0,
    tenantId: "tenant",
    integration: "gmail",
    scope: "user",
    ownerId: "person" as Id<"persons">,
    externalId: "account",
    email: "user@example.com",
    credentials,
    status: "active",
    createdBy: "person" as Id<"persons">,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}
