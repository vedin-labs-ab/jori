import { requireEnvironmentVariable } from "../../shared/environment"

export const githubApiUrl = "https://api.github.com"
export const githubAppInstallBaseUrl = "https://github.com/apps"

export function requireGitHubAppSlug() {
  return requireEnvironmentVariable("GITHUB_APP_SLUG")
}

export function requireGitHubAppId() {
  return requireEnvironmentVariable("GITHUB_APP_ID")
}

export function requireGitHubPrivateKey() {
  return requireEnvironmentVariable("GITHUB_APP_PRIVATE_KEY")
}
