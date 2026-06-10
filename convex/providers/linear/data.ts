import { readProviderDataString } from "../data"

export function getLinearAppUserId(data: unknown) {
  return readProviderDataString(data, "appUserId")
}

export function getLinearOrganizationName(data: unknown) {
  return readProviderDataString(data, "organization", "name")
}

export function getLinearOrganizationUrlKey(data: unknown) {
  return readProviderDataString(data, "organization", "urlKey")
}
