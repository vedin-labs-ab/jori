import { readProviderDataString } from "../data"

export function getGoogleEmail(data: unknown) {
  return readProviderDataString(data, "profile", "email")
}

export function getGoogleName(data: unknown) {
  return readProviderDataString(data, "profile", "name")
}

export function getGoogleGmailHistoryId(data: unknown) {
  return readProviderDataString(data, "gmail", "historyId")
}
