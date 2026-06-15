import { afterEach, expect, test, vi } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { prepareIntegrationForRuntime } from "./runtime"

const githubEnvNames = ["GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY"] as const
const originalGithubEnv = new Map(
  githubEnvNames.map((name) => [name, process.env[name]])
)

afterEach(() => {
  for (const [name, value] of originalGithubEnv) {
    if (value === undefined) {
      delete process.env[name]
    } else {
      process.env[name] = value
    }
  }

  vi.unstubAllGlobals()
})

test("reuses a fresh GitHub installation token", async () => {
  const runMutation = vi.fn()
  const fetch = vi.fn()
  vi.stubGlobal("fetch", fetch)
  const credentials = {
    installationId: "98765",
    tokens: { access: "cached-token" },
    expiresAt: Date.now() + 10 * 60 * 1000,
  }

  const prepared = await prepareIntegrationForRuntime(
    { runMutation } as unknown as ActionCtx,
    {
      integration: githubIntegration(credentials),
    }
  )

  expect(prepared.credentials).toEqual(credentials)
  expect(fetch).not.toHaveBeenCalled()
  expect(runMutation).not.toHaveBeenCalled()
})

test("mints and persists a stale GitHub installation token", async () => {
  process.env.GITHUB_APP_ID = "12345"
  process.env.GITHUB_APP_PRIVATE_KEY = await createPrivateKeyBase64()
  const fetch = vi.fn().mockResolvedValue(
    Response.json({
      token: "installation-token",
      expires_at: "2026-06-12T12:34:56.000Z",
    })
  )
  vi.stubGlobal("fetch", fetch)
  const credentials = {
    installationId: "98765",
    tokens: { access: "stale-token" },
    expiresAt: Date.now() + 60 * 1000,
  }
  const refreshedCredentials = {
    installationId: "98765",
    tokens: { access: "installation-token" },
    expiresAt: Date.parse("2026-06-12T12:34:56.000Z"),
  }
  const runMutation = vi.fn().mockResolvedValue(refreshedCredentials)

  const prepared = await prepareIntegrationForRuntime(
    { runMutation } as unknown as ActionCtx,
    {
      integration: githubIntegration(credentials),
    }
  )

  expect(prepared.credentials).toEqual(refreshedCredentials)
  expect(runMutation).toHaveBeenCalledTimes(1)
  expect(runMutation.mock.calls[0]?.[1]).toEqual({
    integrationId: "integration",
    accessToken: "installation-token",
    expiresAt: Date.parse("2026-06-12T12:34:56.000Z"),
  })
  expect(fetch).toHaveBeenCalledTimes(1)
  const [url, init] = fetch.mock.calls[0]

  expect(url).toBe(
    "https://api.github.com/app/installations/98765/access_tokens"
  )
  expect(init?.method).toBe("POST")
  expect(init?.headers).toMatchObject({
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  })
  expect((init?.headers as Record<string, string>).authorization).toMatch(
    /^Bearer /
  )
})

async function createPrivateKeyBase64() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  )
  const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)

  return Buffer.from(privateKey).toString("base64")
}

function githubIntegration(credentials: unknown): Doc<"integrations"> {
  return {
    _id: "integration",
    _creationTime: 0,
    tenantId: "tenant",
    integration: "github",
    scope: "tenant",
    externalId: "98765",
    credentials,
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}
