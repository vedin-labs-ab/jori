// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import schema from "../../schema"
import { type ProviderInstallState } from "../connect/signing"
import { handleGitHubInstall } from "./ingress/http"
import { createGitHubInstallState, parseSignedGitHubState } from "./signing"

const modules = import.meta.glob("/convex/**/*.{ts,js}")

afterEach(() => vi.unstubAllEnvs())

test("reconnect authorizes the current organization's existing installation without opening installation settings", async () => {
  const t = convexTest(schema, modules)
  const state = await seedState(t, "active")
  const signed = await t.run(async (ctx) =>
    createGitHubInstallState(ctx, state)
  )
  const response = await handleGitHubInstall(installRequest(signed))
  const url = new URL(response.headers.get("location") ?? "")
  expect(url.origin + url.pathname).toBe(
    "https://github.com/login/oauth/authorize"
  )
  expect(url.searchParams.get("client_id")).toBe("eu-client")
  expect(url.searchParams.get("redirect_uri")).toBe(
    "https://eu.example/github/oauth/callback"
  )
  expect(
    await parseSignedGitHubState(url.searchParams.get("state") ?? "")
  ).toEqual({ ...state, installationId: "123" })
})

test.each([
  undefined,
  "expired",
  "disconnected",
] as const)("uses installation flow when the current organization has no active connection (%s)", async (status) => {
  const t = convexTest(schema, modules)
  const state = await seedState(t, status)
  const signed = await t.run(async (ctx) =>
    createGitHubInstallState(ctx, state)
  )
  const response = await handleGitHubInstall(installRequest(signed))
  const url = new URL(response.headers.get("location") ?? "")
  expect(url.origin + url.pathname).toBe(
    "https://github.com/apps/jori-eu/installations/new"
  )
  expect(url.searchParams.get("state")).toBe(signed)
  expect(await parseSignedGitHubState(signed)).toEqual(state)
})

test("does not forward forged reconnect state to GitHub", async () => {
  vi.stubEnv("GITHUB_WEBHOOK_SECRET", "test-secret")
  const response = await handleGitHubInstall(installRequest("forged.state"))
  expect(response.status).toBe(400)
  expect(response.headers.has("location")).toBe(false)
})

function installRequest(state: string) {
  const url = new URL("https://eu.example/github/install")
  url.searchParams.set("state", state)
  return new Request(url)
}

async function seedState(
  t: ReturnType<typeof convexTest>,
  status?: "active" | "expired" | "disconnected"
): Promise<ProviderInstallState> {
  vi.stubEnv("GITHUB_WEBHOOK_SECRET", "test-secret")
  vi.stubEnv("GITHUB_CLIENT_ID", "eu-client")
  vi.stubEnv("GITHUB_APP_SLUG", "jori-eu")
  return await t.run(async (ctx) => {
    const createdBy = await ctx.db.insert("persons", {
      organizationId: "eu",
      createdAt: 0,
      updatedAt: 0,
    })
    const base = {
      createdBy,
      createdAt: 0,
      updatedAt: 0,
      integration: "github" as const,
      scope: "organization" as const,
      credentials: {},
    }
    if (status !== undefined) {
      await ctx.db.insert("integrations", {
        ...base,
        organizationId: "eu",
        externalId: "123",
        status,
      })
    }
    await ctx.db.insert("integrations", {
      ...base,
      organizationId: "us",
      externalId: "456",
      status: "active",
    })
    const attemptId = await ctx.db.insert("integrationInstalls", {
      organizationId: "eu",
      identity: "person",
      sessionId: "session",
      expiresAt: Date.now() + 60_000,
    })
    return {
      attemptId,
      organizationId: "eu",
      createdBy,
      returnUrl: "https://eu.example/integrations",
      createdAt: Date.now(),
    }
  })
}
