import { readProviderDataArray, readProviderDataString } from "../data"

export function getMicrosoftTenantName(data: unknown) {
  return readProviderDataString(data, "tenantName")
}

export function getMicrosoftMentions(data: unknown) {
  const mentions = readProviderDataArray(data, "mentions")

  return mentions
    .map((mention) => readProviderDataString(mention, "mentionText"))
    .filter((mentionText): mentionText is string => mentionText !== undefined)
}
