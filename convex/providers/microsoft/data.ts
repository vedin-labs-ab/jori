import { readProviderDataString } from "../data"

export function getMicrosoftTenantName(data: unknown) {
  return readProviderDataString(data, "tenantName")
}
