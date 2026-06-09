import {
  readProviderDataArray,
  readProviderDataObject,
  readProviderDataString,
} from "../data"

export function getMicrosoftTenantName(data: unknown) {
  const tenant = readProviderDataObject(data, "tenant")

  return readProviderDataString(tenant, "displayName")
}

export function getMicrosoftConnectedUser(data: unknown) {
  const user = readProviderDataObject(data, "user")
  const displayName = readProviderDataString(user, "displayName")
  const userPrincipalName = readProviderDataString(user, "userPrincipalName")

  return displayName ?? userPrincipalName
}

export function getMicrosoftEmail(data: unknown) {
  const user = readProviderDataObject(data, "user")
  const mail = readProviderDataString(user, "mail")
  const userPrincipalName = readProviderDataString(user, "userPrincipalName")

  return mail ?? userPrincipalName
}

export function getMicrosoftConnectedUserId(data: unknown) {
  const user = readProviderDataObject(data, "user")

  return readProviderDataString(user, "id")
}

export function getMicrosoftMentions(data: unknown) {
  const mentions = readProviderDataArray(data, "mentions")

  return mentions
    .map((mention) => readProviderDataString(mention, "mentionText"))
    .filter((mentionText): mentionText is string => mentionText !== undefined)
}
