import { readProviderDataObject, readProviderDataString } from "../data"

export function getLinearAppUserId(data: unknown) {
  return readProviderDataString(data, "appUserId")
}

export function getLinearOrganizationName(data: unknown) {
  const organization = readProviderDataObject(data, "organization")

  return readProviderDataString(organization, "name")
}

export function getLinearOrganizationUrlKey(data: unknown) {
  const organization = readProviderDataObject(data, "organization")

  return readProviderDataString(organization, "urlKey")
}
