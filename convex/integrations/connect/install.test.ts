import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { buildInstallState, upsertIntegration } from "./install"

describe("buildInstallState", () => {
  beforeEach(() => {
    vi.stubEnv("JORI_APP_URL", "https://app.example")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test("returns the signed state fields for a organization member", async () => {
    const ctx = createCtx({ subject: "user_1", org: "organization_1" })
    const state = await buildInstallState(ctx, {
      organizationId: "organization_1",
      returnUrl: "https://app.example/integrations",
    })

    expect(state).toMatchObject({
      organizationId: "organization_1",
      createdBy: "person_1" as Id<"persons">,
      returnUrl: "https://app.example/integrations",
    })
    expect(state.createdAt).toBeLessThanOrEqual(Date.now())
  })

  test("rejects an unauthenticated caller", async () => {
    const ctx = createCtx(null)

    await expect(
      buildInstallState(ctx, {
        organizationId: "organization_1",
        returnUrl: "https://app.example/integrations",
      })
    ).rejects.toThrow("Sign in")
  })

  test("rejects a caller from another organization", async () => {
    const ctx = createCtx({ subject: "user_1", org: "organization_2" })

    await expect(
      buildInstallState(ctx, {
        organizationId: "organization_1",
        returnUrl: "https://app.example/integrations",
      })
    ).rejects.toThrow("another organization")
  })

  test("rejects a return URL outside the Jori app origin", async () => {
    const ctx = createCtx({ subject: "user_1", org: "organization_1" })

    await expect(
      buildInstallState(ctx, {
        organizationId: "organization_1",
        returnUrl: "https://evil.example/integrations",
      })
    ).rejects.toThrow("Return URL must point to the Jori app.")
  })

  test("rejects a relative return URL", async () => {
    const ctx = createCtx({ subject: "user_1", org: "organization_1" })

    await expect(
      buildInstallState(ctx, {
        organizationId: "organization_1",
        returnUrl: "/integrations",
      })
    ).rejects.toThrow("Return URL must be absolute.")
  })
})

test("a reconnect cannot reassign a provider account to another organization", async () => {
  const patch = vi.fn()
  const ctx = { db: { patch, query: retentionQuery } } as unknown as MutationCtx
  const existing = {
    _id: "integration_1",
    organizationId: "owner_org",
  } as Doc<"integrations">
  const values = { organizationId: "attacker_org" } as Parameters<
    typeof upsertIntegration
  >[2]
  await expect(upsertIntegration(ctx, existing, values)).rejects.toThrow(
    "another organization"
  )
  expect(patch).not.toHaveBeenCalled()
})

test.each([
  undefined,
  2,
])("a reconnect refreshes credentials and advances generation %s", async (generation) => {
  const patch = vi.fn()
  const ctx = { db: { patch, query: retentionQuery } } as unknown as MutationCtx
  const existing = {
    _id: "integration_1",
    organizationId: "owner_org",
    connectionGeneration: generation,
  } as Doc<"integrations">
  const values = { organizationId: "owner_org" } as Parameters<
    typeof upsertIntegration
  >[2]
  await expect(upsertIntegration(ctx, existing, values)).resolves.toBe(
    "integration_1"
  )
  expect(patch).toHaveBeenCalledWith("integration_1", {
    ...values,
    connectionGeneration: (generation ?? 0) + 1,
    credentialVersion: 0,
  })
})

function createCtx(identity: Record<string, unknown> | null) {
  return {
    auth: {
      getUserIdentity: async () =>
        identity === null
          ? null
          : { tokenIdentifier: "issuer|user_1", sid: "session_1", ...identity },
    },
    db: {
      get: async () => null,
      insert: async () => "person_1",
      patch: async () => undefined,
      query: (table: string) =>
        table === "workspaceRetention"
          ? retentionQuery(table)
          : {
              withIndex: () => ({
                first: async () =>
                  identity === null
                    ? null
                    : {
                        personId: "person_1" as Id<"persons">,
                        link: { method: "oauth" },
                      },
              }),
            },
    },
  } as unknown as MutationCtx
}

function retentionQuery(table: string) {
  if (table !== "workspaceRetention") {
    throw new Error(`Unexpected table in integration fixture: ${table}`)
  }
  return { withIndex: () => ({ unique: async () => null }) }
}
