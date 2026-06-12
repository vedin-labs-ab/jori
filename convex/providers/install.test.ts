import { describe, expect, test } from "vitest"
import { type MutationCtx } from "../_generated/server"
import { buildInstallState } from "./install"

describe("buildInstallState", () => {
  test("returns the signed state fields for a tenant member", async () => {
    const ctx = createCtx({ subject: "user_1", org: "tenant_1" })
    const state = await buildInstallState(ctx, {
      tenantId: "tenant_1",
      returnUrl: "https://app.example/integrations",
    })

    expect(state).toMatchObject({
      tenantId: "tenant_1",
      createdBy: "user_1",
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
})

function createCtx(identity: Record<string, unknown> | null) {
  return {
    auth: {
      getUserIdentity: async () => identity,
    },
  } as unknown as MutationCtx
}
