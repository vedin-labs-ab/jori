import { requireEnvironmentVariable } from "../../shared/environment"
import {
  githubApiUrl,
  githubAppInstallBaseUrl,
  requireGitHubAppSlug,
} from "./config"

export function githubInstallationUrl(state: string) {
  const url = new URL(
    `${githubAppInstallBaseUrl}/${requireGitHubAppSlug()}/installations/new`
  )
  url.searchParams.set("state", state)
  return url.toString()
}

export function githubAuthorizationUrl(redirectUri: string, state: string) {
  const url = new URL("https://github.com/login/oauth/authorize")
  url.searchParams.set(
    "client_id",
    requireEnvironmentVariable("GITHUB_CLIENT_ID")
  )
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("state", state)
  return url.toString()
}

/** A setup URL's installation_id is untrusted. Prove the authorizing GitHub
 * user can access it before using the app's broader installation credentials. */
export async function verifyGitHubInstallationAccess(args: {
  code: string
  redirectUri: string
  installationId: string
}) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      client_id: requireEnvironmentVariable("GITHUB_CLIENT_ID"),
      client_secret: requireEnvironmentVariable("GITHUB_CLIENT_SECRET"),
      code: args.code,
      redirect_uri: args.redirectUri,
    }),
  })
  const result = (await response.json()) as { access_token?: string }
  if (!response.ok || !result.access_token) {
    throw new Error("GitHub authorization failed.")
  }
  await requireUserInstallation(result.access_token, args.installationId)
}

async function requireUserInstallation(token: string, installationId: string) {
  for (let page = 1; ; page += 1) {
    const response = await fetch(
      `${githubApiUrl}/user/installations?per_page=100&page=${page}`,
      {
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
        },
      }
    )
    if (!response.ok) {
      throw new Error("GitHub installation access could not be verified.")
    }
    const result = (await response.json()) as {
      installations: { id: number }[]
    }
    if (
      result.installations.some(
        (installation) => String(installation.id) === installationId
      )
    ) {
      return
    }
    if (result.installations.length < 100) {
      break
    }
  }
  throw new Error(
    "The authorizing GitHub user cannot access this installation."
  )
}
