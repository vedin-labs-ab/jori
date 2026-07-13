import { readProviderDataString } from "../connect/response"

export function getMicrosoftTenantName(data: unknown) {
  return readProviderDataString(data, "tenantName")
}
