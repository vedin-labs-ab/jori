import { afterEach, describe, expect, test, vi } from "vitest"
import { type ActionCtx } from "../../_generated/server"
import { readCallbackState, readOAuthCallback } from "./http"
import { type ProviderInstallState } from "./signing"

afterEach(() => vi.unstubAllEnvs())

test("unauthenticated callback uses regional first-party session handoff", async () => {
  vi.stubEnv("JORI_APP_URL", "https://eu.jori.app")
  const consume = vi.fn()
  const ctx = {
    auth: { getUserIdentity: async () => null },
    runMutation: consume,
  } as unknown as ActionCtx
  const result = await readOAuthCallback(
    ctx,
    new Request(
      "https://eu.convex.site/google/oauth/callback?code=code&state=state"
    ),
    {
      parse: vi.fn(),
      label: "Google",
    }
  )
  if (result.ok) {
    throw new Error("Expected handoff")
  }
  const redirect = new URL(result.response.headers.get("location") ?? "")
  expect(redirect.origin).toBe("https://eu.jori.app")
  expect(redirect.pathname).toBe("/api/integrations/callback")
  expect(result.response.headers.get("cache-control")).toBe("no-store")
  expect(result.response.headers.get("referrer-policy")).toBe("no-referrer")
  expect(consume).not.toHaveBeenCalled()
})

test("rejects a mismatched or replayed integration session with 403", async () => {
  const ctx = {
    auth: { getUserIdentity: async () => ({ subject: "user" }) },
    runMutation: vi.fn().mockRejectedValue(new Error("wrong session")),
  } as unknown as ActionCtx
  const state = {
    attemptId: "attempt_1",
    createdAt: Date.now(),
  } as ProviderInstallState
  const result = await readOAuthCallback(
    ctx,
    new Request(
      "https://eu.convex.site/google/oauth/callback?code=code&state=state"
    ),
    {
      parse: async () => state,
      label: "Google",
    }
  )
  if (result.ok) {
    throw new Error("Expected rejection")
  }
  expect(result.response.status).toBe(403)
})

describe("readCallbackState", () => {
  test("returns the parsed state while it is fresh", async () => {
    const state = { createdAt: Date.now(), organizationId: "organization_1" }
    const result = await readCallbackState({
      value: JSON.stringify(state),
      parse: parseJsonState,
      label: "Test OAuth",
    })

    expect(result).toEqual({ ok: true, state })
  })

  test.each([
    { value: () => "not-a-state", error: "Invalid" },
    {
      value: () => JSON.stringify({ createdAt: Date.now() - 11 * 60 * 1000 }),
      error: "Expired",
    },
  ])("rejects $error callback state", async ({ value, error }) => {
    const result = await readCallbackState({
      value: value(),
      parse: parseJsonState,
      label: "Test OAuth",
    })

    if (result.ok) {
      throw new Error("Expected a rejected state")
    }

    expect(result.response.status).toBe(400)
    expect(await result.response.text()).toBe(`${error} Test OAuth state`)
  })
})

async function parseJsonState(value: string) {
  return JSON.parse(value) as { createdAt: number }
}
