export function getGoogleEmail(data: unknown) {
  const profile = readGoogleDataObject(data, "profile")

  return readGoogleDataString(profile, "email")
}

export function getGoogleName(data: unknown) {
  const profile = readGoogleDataObject(data, "profile")

  return readGoogleDataString(profile, "name")
}

export function getGoogleGmailHistoryId(data: unknown) {
  const gmail = readGoogleDataObject(data, "gmail")

  return readGoogleDataString(gmail, "historyId")
}

function readGoogleDataObject(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "object" && value !== null ? value : undefined
}

function readGoogleDataString(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "string" ? value : undefined
}
