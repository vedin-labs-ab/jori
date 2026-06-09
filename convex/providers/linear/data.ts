export function getLinearAppUserId(data: unknown) {
  return readLinearDataString(data, "appUserId")
}

export function getLinearOrganizationName(data: unknown) {
  const organization = readLinearDataObject(data, "organization")

  return readLinearDataString(organization, "name")
}

export function getLinearOrganizationUrlKey(data: unknown) {
  const organization = readLinearDataObject(data, "organization")

  return readLinearDataString(organization, "urlKey")
}

function readLinearDataObject(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "object" && value !== null ? value : undefined
}

function readLinearDataString(data: unknown, key: string) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const value = (data as Record<string, unknown>)[key]

  return typeof value === "string" ? value : undefined
}
