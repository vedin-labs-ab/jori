import { type MutationCtx } from "../../_generated/server"
import { upsertIdentity } from "../../identity/identities"
import { type MicrosoftInstallationProfile } from "./oauth"

export function getMicrosoftAccountId(profile: MicrosoftInstallationProfile) {
  return profile.user.mail ?? profile.user.userPrincipalName ?? profile.user.id
}

export function getMicrosoftIdentityEmail(
  profile: MicrosoftInstallationProfile
) {
  return profile.user.mail ?? profile.user.userPrincipalName
}

export async function upsertMicrosoftIdentity(
  ctx: MutationCtx,
  args: {
    tenantId: string
    userId: string
    microsoftTenantId: string
    email: string | undefined
    profile: MicrosoftInstallationProfile
  }
) {
  await upsertIdentity(ctx, {
    tenantId: args.tenantId,
    userId: args.userId,
    provider: "microsoft",
    providerAccountId: args.microsoftTenantId,
    externalUserId: args.profile.user.id,
    email: args.email,
  })
}
