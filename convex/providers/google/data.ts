import { readProviderDataString } from "../data"

export function getGoogleGmailHistoryId(data: unknown) {
  return readProviderDataString(data, "gmail", "historyId")
}
