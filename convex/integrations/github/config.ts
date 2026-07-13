export const githubApiUrl = "https://api.github.com"
export const githubAppInstallBaseUrl = "https://github.com/apps"

export function requireGitHubAppSlug() {
  const slug = process.env.GITHUB_APP_SLUG

  if (slug === undefined || slug === "") {
    throw new Error("Missing GITHUB_APP_SLUG")
  }

  return slug
}

export function requireGitHubAppId() {
  const appId = process.env.GITHUB_APP_ID

  if (appId === undefined || appId === "") {
    throw new Error("Missing GITHUB_APP_ID")
  }

  return appId
}

export function requireGitHubPrivateKey() {
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY

  if (privateKey === undefined || privateKey === "") {
    throw new Error("Missing GITHUB_APP_PRIVATE_KEY")
  }

  return privateKey
}
