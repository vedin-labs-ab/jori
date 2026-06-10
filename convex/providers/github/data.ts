import { readProviderDataString } from "../data"

export function getGitHubAccountLogin(data: unknown) {
  return readProviderDataString(data, "account", "login")
}

export function getGitHubAccountType(data: unknown) {
  return readProviderDataString(data, "account", "type")
}

export function getGitHubAppSlug(data: unknown) {
  return readProviderDataString(data, "appSlug")
}
