import { type MicrosoftInstallationProfile } from "./oauth"

export function getMicrosoftIdentityEmail(
  profile: MicrosoftInstallationProfile
) {
  return profile.user.mail ?? profile.user.userPrincipalName
}
