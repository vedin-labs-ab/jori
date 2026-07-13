import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { buildInstallState } from "./install"

describe("buildInstallState", () => {
  beforeEach(() => {
    vi.stubEnv("MILO_APP_URL", "https://app.example")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test("returns the signed state fields for a tenant member", async () => {
    const ctx = createCtx({ subject: "user_1", org: "tenant_1" })
    const state = await buildInstallState(ctx, {
      tenantId: "tenant_1",
      returnUrl: "https://app.example/integrations",
    })

    expect(state).toMatchObject({
      tenantId: "tenant_1",
      createdBy: "person_1" as Id<"persons">,
      returnUrl: "https://app.example/integrations",
    })
    expect(state.createdAt).toBeLessThanOrEqual(Date.now())
  })

  test("rejects an unauthenticated caller", async () => {
    const ctx = createCtx(null)

    await expect(
      buildInstallState(ctx, {
        tenantId: "tenant_1",
        returnUrl: "https://app.example/integrations",
      })
    ).rejects.toThrow("Sign in")
  })

  test("rejects a caller from another organization", async () => {
    const ctx = createCtx({ subject: "user_1", org: "tenant_2" })

    await expect(
      buildInstallState(ctx, {
        tenantId: "tenant_1",
        returnUrl: "https://app.example/integrations",
      })
    ).rejects.toThrow("another organization")
  })

  test("rejects a return URL outside the Milo app origin", async () => {
    const ctx = createCtx({ subject: "user_1", org: "tenant_1" })

    await expect(
      buildInstallState(ctx, {
        tenantId: "tenant_1",
        returnUrl: "https://evil.example/integrations",
      })
    ).rejects.toThrow("Return URL must point to the Milo app.")
  })

  test("rejects a relative return URL", async () => {
    const ctx = createCtx({ subject: "user_1", org: "tenant_1" })

    await expect(
      buildInstallState(ctx, {
        tenantId: "tenant_1",
        returnUrl: "/integrations",
      })
    ).rejects.toThrow("Return URL must be absolute.")
  })
})

function createCtx(identity: Record<string, unknown> | null) {
  return {
    auth: {
      getUserIdentity: async () => identity,
    },
    db: {
      get: async () => null,
      insert: async () => "person_1",
      patch: async () => undefined,
      query: () => ({
        withIndex: () => ({
          first: async () =>
            identity === null
              ? null
              : {
                  personId: "person_1" as Id<"persons">,
                  link: { method: "oauth" },
                },
        }),
      }),
    },
  } as unknown as MutationCtx
}
