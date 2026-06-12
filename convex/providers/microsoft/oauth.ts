import { fetchFormToken, requireProviderEnv } from "../oauth"
import { microsoftGraphUrl, microsoftOAuthTokenUrl } from "./config"

export type MicrosoftTokenResponse =
  | {
      access_token: string
      token_type: string
      expires_in: number
      scope?: string
      refresh_token?: string
    }
  | {
      error: string
      error_description?: string
    }

export type MicrosoftInstallationProfile = {
  user: {
    id: string
    displayName?: string
    userPrincipalName?: string
    mail?: string
  }
  tenant: {
    id: string
    displayName?: string
  }
}

export function requireMicrosoftClientId() {
  return requireProviderEnv("MICROSOFT_CLIENT_ID")
}

export function requireMicrosoftClientSecret() {
  return requireProviderEnv("MICROSOFT_CLIENT_SECRET")
}

export async function exchangeMicrosoftAuthorizationCode(args: {
  code: string
  redirectUri: string
  tenantId?: string
}) {
  return await requestMicrosoftToken(args.tenantId ?? "organizations", {
    code: args.code,
    grant_type: "authorization_code",
    redirect_uri: args.redirectUri,
  })
}

export async function refreshMicrosoftAccessToken(args: {
  refreshToken: string
  tenantId: string
}) {
  return await requestMicrosoftToken(args.tenantId, {
    grant_type: "refresh_token",
    refresh_token: args.refreshToken,
  })
}

export async function fetchMicrosoftInstallationProfile(args: {
  accessToken: string
  tenantId?: string
}) {
  const me = (await microsoftGraphGet(args.accessToken, "/me")) as {
    id?: string
    displayName?: string
    userPrincipalName?: string
    mail?: string
  }
  const tokenTenantId = readJwtStringClaim(args.accessToken, "tid")
  const tenantId = args.tenantId ?? tokenTenantId

  if (me.id === undefined) {
    throw new Error("Could not read Microsoft installation user")
  }

  if (tenantId === undefined) {
    throw new Error("Could not read Microsoft installation tenant")
  }

  return {
    user: {
      id: me.id,
      displayName: me.displayName,
      userPrincipalName: me.userPrincipalName,
      mail: me.mail,
    },
    tenant: {
      id: tenantId,
    },
  } satisfies MicrosoftInstallationProfile
}

async function requestMicrosoftToken(
  tenantId: string,
  body: Record<string, string>
) {
  return await fetchFormToken<MicrosoftTokenResponse>(
    microsoftOAuthTokenUrl(tenantId),
    {
      client_id: requireMicrosoftClientId(),
      client_secret: requireMicrosoftClientSecret(),
      ...body,
    }
  )
}

async function microsoftGraphGet(accessToken: string, path: string) {
  const response = await fetch(`${microsoftGraphUrl}${path}`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(`Microsoft Graph request failed: ${JSON.stringify(result)}`)
  }

  return result
}

function readJwtStringClaim(token: string, claim: string) {
  const [, payload] = token.split(".")

  if (payload === undefined) {
    return undefined
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    )
    const decoded = JSON.parse(atob(padded)) as Record<string, unknown>
    const value = decoded[claim]

    return typeof value === "string" ? value : undefined
  } catch {
    return undefined
  }
}
