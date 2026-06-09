import { readProviderDataObject, readProviderDataString } from "../data"

export function getGitHubAccountLogin(data: unknown) {
  const account = readProviderDataObject(data, "account")

  return readProviderDataString(account, "login")
}

export function getGitHubAccountType(data: unknown) {
  const account = readProviderDataObject(data, "account")

  return readProviderDataString(account, "type")
}

export function getGitHubAppSlug(data: unknown) {
  return readProviderDataString(data, "appSlug")
}
