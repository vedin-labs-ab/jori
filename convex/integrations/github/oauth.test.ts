import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { verifyGitHubInstallationAccess } from "./oauth"

beforeEach(() => {
  vi.stubEnv("GITHUB_CLIENT_ID", "test_client")
  vi.stubEnv("GITHUB_CLIENT_SECRET", "test_secret")
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
const args = {
  code: "test_code",
  redirectUri: "https://eu.convex.site/github/oauth/callback",
  installationId: "42",
}

test("proves installation access using the authorizing user's token", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ access_token: "user-token" }))
    .mockResolvedValueOnce(Response.json({ installations: [{ id: 42 }] }))
  vi.stubGlobal("fetch", fetchMock)
  await expect(verifyGitHubInstallationAccess(args)).resolves.toBeUndefined()
  expect(fetchMock.mock.calls[1]?.[0]).toBe(
    "https://api.github.com/user/installations?per_page=100&page=1"
  )
  expect(fetchMock.mock.calls[1]?.[1].headers.authorization).toBe(
    "Bearer user-token"
  )
})

test("rejects a substituted installation belonging to another GitHub user", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ access_token: "user-token" }))
    .mockResolvedValueOnce(Response.json({ installations: [{ id: 999 }] }))
  vi.stubGlobal("fetch", fetchMock)
  await expect(verifyGitHubInstallationAccess(args)).rejects.toThrow(
    "cannot access"
  )
})

test("does not inspect installations after failed authorization", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ error: "bad_verification_code" }))
  vi.stubGlobal("fetch", fetchMock)
  await expect(verifyGitHubInstallationAccess(args)).rejects.toThrow(
    "authorization failed"
  )
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
