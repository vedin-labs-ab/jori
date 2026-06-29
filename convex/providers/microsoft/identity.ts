import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { linkIdentityToPerson } from "../../persons/links"
import { type MicrosoftInstallationProfile } from "./oauth"

export function getMicrosoftIdentityEmail(
  profile: MicrosoftInstallationProfile
) {
  return profile.user.mail ?? profile.user.userPrincipalName
}

export async function upsertMicrosoftIdentity(
  ctx: MutationCtx,
  args: {
    tenantId: string
    personId: Id<"persons">
    microsoftTenantId: string
    email: string | undefined
    profile: MicrosoftInstallationProfile
  }
) {
  await linkIdentityToPerson(ctx, {
    tenantId: args.tenantId,
    personId: args.personId,
    provider: "microsoft",
    externalId: args.profile.user.id,
    method: "oauth",
    email: args.email,
    name: args.profile.user.displayName,
  })
}
