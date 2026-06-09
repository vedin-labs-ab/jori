import { readProviderDataObject, readProviderDataString } from "../data"

export function getGoogleEmail(data: unknown) {
  const profile = readProviderDataObject(data, "profile")

  return readProviderDataString(profile, "email")
}

export function getGoogleName(data: unknown) {
  const profile = readProviderDataObject(data, "profile")

  return readProviderDataString(profile, "name")
}

export function getGoogleGmailHistoryId(data: unknown) {
  const gmail = readProviderDataObject(data, "gmail")

  return readProviderDataString(gmail, "historyId")
}
