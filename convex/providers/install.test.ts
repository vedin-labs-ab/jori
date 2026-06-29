import { describe, expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
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
