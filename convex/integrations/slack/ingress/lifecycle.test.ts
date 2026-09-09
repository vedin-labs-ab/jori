import { afterEach, expect, test, vi } from "vitest"
import { integrationDoc } from "../../../../test/convex/integrations"
import { type ActionCtx } from "../../../_generated/server"
import { handleSlackLifecycleEvent } from "./lifecycle"

afterEach(() => {
  vi.unstubAllGlobals()
})

const installedAt = 1_710_000_000_000

function integration() {
  return integrationDoc({
    integration: "slack",
    externalId: "TTEST",
    data: { installedAt },
    credentials: {
      bot: {
        access: "bot",
        refresh: "bot-refresh",
        expiresAt: Date.now() + 60 * 60_000,
      },
      user: {
        access: "user",
        refresh: "user-refresh",
        expiresAt: Date.now() + 60 * 60_000,
      },
    },
  })
}

test("a Slack uninstall deactivates its current installation", async () => {
  const runMutation = vi.fn().mockResolvedValue(null)
  expect(
    await handleSlackLifecycleEvent(
      { runMutation } as unknown as ActionCtx,
      integration(),
      {
        type: "event_callback",
        event_time: installedAt / 1000 + 1,
        event: { type: "app_uninstalled" },
      }
    )
  ).toBe(true)
  expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
    integrationId: "integration",
    expectedSnapshot: { connectionGeneration: 0, credentialVersion: 0 },
    installedAt,
    status: "disconnected",
  })
})

test("a delayed uninstall cannot deactivate a newer installation", async () => {
  const runMutation = vi.fn()
  await handleSlackLifecycleEvent(
    { runMutation } as unknown as ActionCtx,
    integration(),
    {
      type: "event_callback",
      event_time: installedAt / 1000 - 60,
      event: { type: "app_uninstalled" },
    }
  )
  expect(runMutation).not.toHaveBeenCalled()
})

test("revocation of an old rotating token preserves working current credentials", async () => {
  const runMutation = vi.fn()
  const fetch = vi
    .fn()
    .mockImplementation(async () => Response.json({ ok: true }))
  vi.stubGlobal("fetch", fetch)
  await handleSlackLifecycleEvent(
    { runMutation } as unknown as ActionCtx,
    integration(),
    {
      type: "event_callback",
      event: { type: "tokens_revoked", tokens: { bot: ["UBOT"] } },
    }
  )
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(runMutation).not.toHaveBeenCalled()
})

test("a revoked current Slack grant expires the connection", async () => {
  const runMutation = vi.fn()
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(async () =>
        Response.json({ ok: false, error: "token_revoked" })
      )
  )
  await handleSlackLifecycleEvent(
    { runMutation } as unknown as ActionCtx,
    integration(),
    {
      type: "event_callback",
      event: { type: "tokens_revoked" },
    }
  )
  expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
    integrationId: "integration",
    expectedSnapshot: { connectionGeneration: 0, credentialVersion: 0 },
    installedAt,
    status: "expired",
  })
})

test("Slack outages retry revocation checks without disconnecting the customer", async () => {
  const runMutation = vi.fn()
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(
        async () => new Response("unavailable", { status: 503 })
      )
  )
  await expect(
    handleSlackLifecycleEvent(
      { runMutation } as unknown as ActionCtx,
      integration(),
      {
        type: "event_callback",
        event: { type: "tokens_revoked" },
      }
    )
  ).rejects.toThrow("Slack token validation is unavailable")
  expect(runMutation).not.toHaveBeenCalled()
})
