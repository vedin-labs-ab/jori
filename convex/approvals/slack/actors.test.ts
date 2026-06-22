import { afterEach, expect, test, vi } from "vitest"
import { type ActionCtx } from "../../_generated/server"
import { getActorDisplayName } from "../../shared/actor"
import { createSlackApprovalActor } from "."

afterEach(() => {
  vi.unstubAllGlobals()
})

test("hydrates Slack approval actors with profile names", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        ok: true,
        user: {
          profile: {
            email: "albin@example.com",
            real_name: "ÅÄÖ 😊",
          },
        },
      })
    )
  )
  let accountLookupCount = 0
  const ctx = {
    runMutation: vi.fn(async () => "identity_123"),
    runQuery: vi.fn(
      async (_reference: unknown, args: Record<string, unknown>) => {
        if ("provider" in args) {
          return null
        }

        if ("email" in args) {
          return "user_123"
        }

        accountLookupCount += 1

        return accountLookupCount === 1
          ? { tenantId: "tenant_1" }
          : "xoxp-user-token"
      }
    ),
  } as unknown as ActionCtx

  const actor = await createSlackApprovalActor(ctx, {
    accountId: "T123",
    actorId: "U123",
  })

  expect(getActorDisplayName(actor)).toBe("ÅÄÖ 😊")
  expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(), {
    tenantId: "tenant_1",
    userId: "user_123",
    provider: "slack",
    externalId: "U123",
    email: "albin@example.com",
    name: "ÅÄÖ 😊",
  })
  expect(accountLookupCount).toBe(2)
})

test("hydrates Slack approval actors from cached identities first", async () => {
  const fetch = vi.fn()
  vi.stubGlobal("fetch", fetch)
  let accountLookupCount = 0
  const ctx = {
    runMutation: vi.fn(),
    runQuery: vi.fn(
      async (_reference: unknown, args: Record<string, unknown>) => {
        if ("provider" in args) {
          return { email: "albin@example.com", name: "Albin Vedin" }
        }

        accountLookupCount += 1

        return { tenantId: "tenant_1" }
      }
    ),
  } as unknown as ActionCtx

  const actor = await createSlackApprovalActor(ctx, {
    accountId: "T123",
    actorId: "U123",
  })

  expect(getActorDisplayName(actor)).toBe("Albin Vedin")
  expect(fetch).not.toHaveBeenCalled()
  expect(ctx.runMutation).not.toHaveBeenCalled()
  expect(accountLookupCount).toBe(1)
})
