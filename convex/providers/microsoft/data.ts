export function getMicrosoftTenantName(data: unknown) {
  const tenant = readMicrosoftDataObject(data, "tenant")

  return readMicrosoftDataString(tenant, "displayName")
}

export function getMicrosoftConnectedUser(data: unknown) {
  const user = readMicrosoftDataObject(data, "user")
  const displayName = readMicrosoftDataString(user, "displayName")
  const userPrincipalName = readMicrosoftDataString(user, "userPrincipalName")

  return displayName ?? userPrincipalName
}

export function getMicrosoftEmail(data: unknown) {
  const user = readMicrosoftDataObject(data, "user")
  const mail = readMicrosoftDataString(user, "mail")
  const userPrincipalName = readMicrosoftDataString(user, "userPrincipalName")

  return mail ?? userPrincipalName
}

export function getMicrosoftConnectedUserId(data: unknown) {
  const user = readMicrosoftDataObject(data, "user")

  return readMicrosoftDataString(user, "id")
}

export function getMicrosoftMentions(data: unknown) {
  const mentions = readMicrosoftDataArray(data, "mentions")

  return mentions
    .map((mention) => readMicrosoftDataString(mention, "mentionText"))
    .filter((mentionText): mentionText is string => mentionText !== undefined)
}

function readMicrosoftDataObject(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "object" && value !== null ? value : undefined
}

function readMicrosoftDataArray(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return []
  }

  const value = (data as Record<string, unknown>)[key]

  return Array.isArray(value) ? value : []
}

function readMicrosoftDataString(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "string" ? value : undefined
}
