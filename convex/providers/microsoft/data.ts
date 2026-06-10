import { readProviderDataArray, readProviderDataString } from "../data"

export function getMicrosoftTenantName(data: unknown) {
  return readProviderDataString(data, "tenant", "displayName")
}

export function getMicrosoftConnectedUser(data: unknown) {
  const displayName = readProviderDataString(data, "user", "displayName")
  const userPrincipalName = readProviderDataString(
    data,
    "user",
    "userPrincipalName"
  )

  return displayName ?? userPrincipalName
}

export function getMicrosoftEmail(data: unknown) {
  const mail = readProviderDataString(data, "user", "mail")
  const userPrincipalName = readProviderDataString(
    data,
    "user",
    "userPrincipalName"
  )

  return mail ?? userPrincipalName
}

export function getMicrosoftConnectedUserId(data: unknown) {
  return readProviderDataString(data, "user", "id")
}

export function getMicrosoftMentions(data: unknown) {
  const mentions = readProviderDataArray(data, "mentions")

  return mentions
    .map((mention) => readProviderDataString(mention, "mentionText"))
    .filter((mentionText): mentionText is string => mentionText !== undefined)
}
