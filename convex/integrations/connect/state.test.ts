import { describe, expect, test, vi } from "vitest"
import { databaseContext } from "../../../test/convex/database"
import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { consumeInstallAttempt } from "./state"

const attemptId = "attempt_1" as Id<"integrationInstalls">
const identity = {
  tokenIdentifier: "issuer|user_1",
  sid: "session_1",
  org: "org_1",
}

function context(
  caller: Record<string, unknown> | null = identity,
  expired = false
) {
  let exists = true
  const remove = vi.fn(async () => {
    exists = false
  })
  const ctx = {
    auth: { getUserIdentity: async () => caller },
    db: {
      ...databaseContext().database,
      get: async () =>
        exists
          ? {
              organizationId: "org_1",
              identity: identity.tokenIdentifier,
              sessionId: identity.sid,
              expiresAt: Date.now() + (expired ? -1000 : 60_000),
            }
          : null,
      delete: remove,
    },
  } as unknown as MutationCtx
  return { ctx, remove }
}

describe("one-time integration session", () => {
  test("consumes once and rejects replay", async () => {
    const { ctx, remove } = context()
    await consumeInstallAttempt(ctx, attemptId)
    await expect(consumeInstallAttempt(ctx, attemptId)).rejects.toThrow(
      "already used"
    )
    expect(remove).toHaveBeenCalledTimes(1)
  })

  test.each([
    null,
    { ...identity, tokenIdentifier: "issuer|attacker" },
    { ...identity, sid: "another_session" },
    { ...identity, org: "another_org" },
  ])("rejects mismatched caller without consuming", async (caller) => {
    const { ctx, remove } = context(caller)
    await expect(consumeInstallAttempt(ctx, attemptId)).rejects.toThrow()
    expect(remove).not.toHaveBeenCalled()
  })

  test("rejects expired attempts", async () => {
    const { ctx, remove } = context(identity, true)
    await expect(consumeInstallAttempt(ctx, attemptId)).rejects.toThrow(
      "expired"
    )
    expect(remove).not.toHaveBeenCalled()
  })
})
