import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { integrationLabel } from "../shared/integrations"
import { credentialSnapshot } from "./connect/snapshot"

type RuntimeIntegration = Doc<"integrations">

/** Exchange a little before the provider's stated expiry so a token cannot
 *  lapse partway through a run that is already in flight. */
const tokenRefreshBufferMs = 5 * 60 * 1000

export function hasFreshTokenExpiration(expiresAt: number) {
  return expiresAt > Date.now() + tokenRefreshBufferMs
}

// OAuth providers signal a permanently dead grant (revoked consent, expired
// refresh token) with "invalid_grant"; only a full reconnect recovers from it.
export async function failOAuthRefresh(
  ctx: ActionCtx,
  integration: RuntimeIntegration,
  platform: string,
  result: { error: string; error_description?: string }
): Promise<never> {
  if (result.error !== "invalid_grant") {
    throw tokenRefreshError(platform, result)
  }

  const expired = await ctx.runMutation(
    internal.integrations.expire.markExpired,
    {
      integrationId: integration._id,
      expectedSnapshot: credentialSnapshot(integration),
    }
  )

  if (expired === false) {
    throw new Error("Integration connection changed during token refresh")
  }

  throw new Error(
    `${integrationLabel(integration.integration)} access has expired and needs to be reconnected.`
  )
}

function tokenRefreshError(
  platform: string,
  result: { error: string; error_description?: string }
) {
  return new Error(
    `${platform} token refresh failed: ${result.error_description ?? result.error}`
  )
}

export function withCredentials(
  integration: RuntimeIntegration,
  credentials: RuntimeIntegration["credentials"]
): RuntimeIntegration {
  return {
    ...integration,
    credentials,
    credentialVersion: (integration.credentialVersion ?? 0) + 1,
  }
}
