import { readProviderDataString } from "../data"

export function getGitHubAppSlug(data: unknown) {
  return readProviderDataString(data, "appSlug")
}

export function getGitHubAccountType(data: unknown) {
  return readProviderDataString(data, "accountType")
}
