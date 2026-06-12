import { afterEach, describe, expect, test, vi } from "vitest"
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

describe("runtime integration credentials", () => {
  test("mints a GitHub installation token without persisting it", async () => {
    process.env.GITHUB_APP_ID = "12345"
    process.env.GITHUB_APP_PRIVATE_KEY = await createPrivateKeyBase64()
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        token: "installation-token",
        expires_at: "2026-06-12T12:34:56.000Z",
      })
    )
    vi.stubGlobal("fetch", fetch)

    const prepared = await prepareIntegrationForRuntime({} as ActionCtx, {
      integration: githubIntegration({ installationId: "98765" }),
    })

    expect(prepared.credentials).toEqual({
      installationId: "98765",
      tokens: { access: "installation-token" },
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
    provider: "github",
    scope: "tenant",
    externalId: "98765",
    credentials,
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}
