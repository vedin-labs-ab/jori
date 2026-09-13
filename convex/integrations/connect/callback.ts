import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { redirectWithStatus } from "./http"
import { completeIntegrationOffer, failOfferAndRedirect } from "./install"
import { type ProviderInstallState } from "./signing"

type OAuthCredentials = {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scope?: string
}

export async function completeOAuthInstallation<Profile>(
  ctx: ActionCtx,
  args: {
    state: ProviderInstallState
    integration: string
    tokenResult:
      | {
          access_token: string
          refresh_token?: string
          expires_in: number
          scope?: string
        }
      | { error: string }
    profile: (accessToken: string) => Promise<Profile>
    record: (
      credentials: OAuthCredentials,
      profile: Profile
    ) => Promise<Id<"integrations">>
  }
) {
  const { state, integration, tokenResult } = args
  const fail = (error: string) =>
    failOfferAndRedirect(ctx, {
      callbackParam: integration,
      error: `${integration} ${error}.`,
      integrationOfferId: state.integrationOfferId,
      returnUrl: state.returnUrl,
    })

  if ("error" in tokenResult) {
    return await fail("OAuth token exchange failed")
  }

  let profile: Profile
  try {
    profile = await args.profile(tokenResult.access_token)
  } catch {
    return await fail("installation profile could not be loaded")
  }

  try {
    const integrationId = await args.record(
      {
        accessToken: tokenResult.access_token,
        refreshToken: tokenResult.refresh_token,
        expiresAt: Date.now() + tokenResult.expires_in * 1000,
        scope: tokenResult.scope,
      },
      profile
    )
    await completeIntegrationOffer(ctx, {
      integrationOfferId: state.integrationOfferId,
      integrationId,
    })
  } catch {
    return await fail("installation could not be recorded")
  }

  return redirectWithStatus(state.returnUrl, integration, "connected")
}
