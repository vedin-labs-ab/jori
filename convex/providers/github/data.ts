export function getGitHubAccountLogin(data: unknown) {
  const account = readGitHubDataObject(data, "account")

  return readGitHubDataString(account, "login")
}

export function getGitHubAccountType(data: unknown) {
  const account = readGitHubDataObject(data, "account")

  return readGitHubDataString(account, "type")
}

export function getGitHubAppSlug(data: unknown) {
  return readGitHubDataString(data, "appSlug")
}

function readGitHubDataObject(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "object" && value !== null ? value : undefined
}

function readGitHubDataString(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "string" ? value : undefined
}
