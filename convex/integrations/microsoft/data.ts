import { readProviderDataString } from "../connect/response"
import { type MicrosoftInstallationProfile } from "./oauth"

export function getMicrosoftTenantName(data: unknown) {
  return readProviderDataString(data, "tenantName")
}

export function getMicrosoftIdentityEmail(
  profile: MicrosoftInstallationProfile
) {
  return profile.user.mail ?? profile.user.userPrincipalName
}
